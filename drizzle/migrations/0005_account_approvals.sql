CREATE TABLE IF NOT EXISTS public.account_approvals (
  user_id uuid PRIMARY KEY,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('reader', 'author', 'publisher')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_approvals_email_idx
  ON public.account_approvals (lower(email));

CREATE INDEX IF NOT EXISTS account_approvals_role_status_idx
  ON public.account_approvals (role, status);

ALTER TABLE public.publishers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'author',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.account_approvals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_approvals TO authenticated;
GRANT ALL ON public.account_approvals TO service_role;

DROP POLICY IF EXISTS "account_approvals_select_own_or_admin" ON public.account_approvals;
CREATE POLICY "account_approvals_select_own_or_admin"
  ON public.account_approvals
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  );

DROP POLICY IF EXISTS "account_approvals_insert_own_or_admin" ON public.account_approvals;
CREATE POLICY "account_approvals_insert_own_or_admin"
  ON public.account_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
    OR (
      user_id = auth.uid()
      AND (
        (role = 'reader' AND status = 'approved')
        OR (role IN ('author', 'publisher') AND status = 'pending')
      )
    )
  );

DROP POLICY IF EXISTS "account_approvals_update_admin_only" ON public.account_approvals;
CREATE POLICY "account_approvals_update_admin_only"
  ON public.account_approvals
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  );

DROP POLICY IF EXISTS "account_approvals_delete_admin_only" ON public.account_approvals;
CREATE POLICY "account_approvals_delete_admin_only"
  ON public.account_approvals
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  );

DROP POLICY IF EXISTS "publishers_admin_all" ON public.publishers;
CREATE POLICY "publishers_admin_all"
  ON public.publishers
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  );

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  );

DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
CREATE POLICY "orders_admin_select"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  );

CREATE OR REPLACE FUNCTION public.upsert_my_account_approval(
  _user_id uuid,
  _email text,
  _name text,
  _role text
)
RETURNS public.account_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.account_approvals;
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _role NOT IN ('reader', 'author', 'publisher') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  v_status := CASE WHEN _role = 'reader' THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.account_approvals (user_id, email, name, role, status, applied_at, approved_at, updated_at)
  VALUES (
    _user_id,
    lower(trim(coalesce(_email, ''))),
    coalesce(nullif(trim(_name), ''), split_part(lower(trim(coalesce(_email, ''))), '@', 1)),
    _role,
    v_status,
    now(),
    CASE WHEN v_status = 'approved' THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.account_approvals.email),
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.account_approvals.name),
    role = CASE
      WHEN public.account_approvals.role IN ('author', 'publisher') AND EXCLUDED.role = 'reader'
        THEN public.account_approvals.role
      ELSE EXCLUDED.role
    END,
    updated_at = now()
  RETURNING * INTO v_row;

  IF v_row.role IN ('author', 'publisher') THEN
    INSERT INTO public.publishers (id, store_name, email, account_type, approval_status)
    VALUES (
      _user_id,
      v_row.name,
      v_row.email,
      v_row.role,
      v_row.status
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.publishers.email),
      account_type = v_row.role,
      approval_status = v_row.status;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_approval(
  _user_id uuid,
  _email text,
  _name text,
  _role text,
  _status text,
  _notes text DEFAULT NULL
)
RETURNS public.account_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.account_approvals;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'highsupply2025@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _role NOT IN ('reader', 'author', 'publisher') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF _status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  INSERT INTO public.account_approvals (
    user_id, email, name, role, status, notes, applied_at, approved_at, updated_at
  )
  VALUES (
    _user_id,
    lower(trim(coalesce(_email, ''))),
    coalesce(nullif(trim(_name), ''), 'مستخدم المنصة'),
    _role,
    _status,
    _notes,
    now(),
    CASE WHEN _status = 'approved' THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.account_approvals.email),
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.account_approvals.name),
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    notes = COALESCE(EXCLUDED.notes, public.account_approvals.notes),
    approved_at = CASE WHEN EXCLUDED.status = 'approved' THEN now() ELSE public.account_approvals.approved_at END,
    updated_at = now()
  RETURNING * INTO v_row;

  IF _role IN ('author', 'publisher') THEN
    INSERT INTO public.publishers (id, store_name, email, account_type, approval_status, approval_notes, approved_at)
    VALUES (
      _user_id,
      v_row.name,
      v_row.email,
      _role,
      _status,
      _notes,
      CASE WHEN _status = 'approved' THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
      store_name = COALESCE(NULLIF(EXCLUDED.store_name, ''), public.publishers.store_name),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.publishers.email),
      account_type = _role,
      approval_status = _status,
      approval_notes = COALESCE(EXCLUDED.approval_notes, public.publishers.approval_notes),
      approved_at = CASE WHEN _status = 'approved' THEN now() ELSE public.publishers.approved_at END;
  END IF;

  RETURN v_row;
END;
$$;
