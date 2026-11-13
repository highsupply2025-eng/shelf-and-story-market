-- Account applications: author / publisher sign-ups awaiting admin review.
-- Stored in the database so every admin sees every applicant (previously kept in each browser).

CREATE TYPE public.account_application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.account_applications (
  user_id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'author', 'publisher')),
  status public.account_application_status NOT NULL DEFAULT 'pending',
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  review_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_applications TO authenticated;
GRANT ALL ON public.account_applications TO service_role;

ALTER TABLE public.account_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants read own application"
  ON public.account_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all applications"
  ON public.account_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX account_applications_status_idx ON public.account_applications (status, created_at DESC);

-- New sign-ups: readers are approved immediately, authors/publishers wait for review.
CREATE OR REPLACE FUNCTION public.handle_new_account_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text := coalesce(NEW.raw_user_meta_data ->> 'account_type', 'reader');
BEGIN
  IF _role NOT IN ('reader', 'author', 'publisher') THEN
    _role := 'reader';
  END IF;
  INSERT INTO public.account_applications (user_id, role, status, display_name, email, country)
  VALUES (
    NEW.id,
    _role,
    CASE WHEN _role = 'reader' THEN 'approved'::public.account_application_status ELSE 'pending'::public.account_application_status END,
    coalesce(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''),
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data ->> 'country', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_account_application
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account_application();

-- Backfill accounts that registered before this table existed.
INSERT INTO public.account_applications (user_id, role, status, display_name, email, country, created_at)
SELECT
  u.id,
  CASE
    WHEN u.raw_user_meta_data ->> 'account_type' IN ('reader', 'author', 'publisher') THEN u.raw_user_meta_data ->> 'account_type'
    WHEN EXISTS (SELECT 1 FROM public.publishers p WHERE p.id = u.id) THEN 'publisher'
    ELSE 'reader'
  END,
  CASE
    WHEN coalesce(u.raw_user_meta_data ->> 'account_type', 'reader') IN ('author', 'publisher') THEN 'pending'::public.account_application_status
    ELSE 'approved'::public.account_application_status
  END,
  coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'country', '')
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Admin-only review. Applicants cannot approve themselves.
CREATE OR REPLACE FUNCTION public.review_account_application(_user_id uuid, _status public.account_application_status, _note text DEFAULT '')
RETURNS public.account_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.account_applications;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.account_applications
     SET status = _status,
         review_note = coalesce(_note, ''),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE user_id = _user_id
  RETURNING * INTO _row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found';
  END IF;
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.review_account_application(uuid, public.account_application_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_account_application(uuid, public.account_application_status, text) TO authenticated;
