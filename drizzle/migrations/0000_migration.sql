
create type public.app_role as enum ('admin','user');
create type public.book_format as enum ('digital','physical','both');
create type public.book_status as enum ('pending','approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.publishers (
  id uuid primary key,
  store_name text not null,
  bio text,
  created_at timestamptz not null default now()
);
grant select on public.publishers to anon;
grant select, insert, update on public.publishers to authenticated;
grant all on public.publishers to service_role;
alter table public.publishers enable row level security;
create policy "publishers public" on public.publishers for select to anon, authenticated using (true);
create policy "create own publisher" on public.publishers for insert to authenticated with check (auth.uid() = id);
create policy "update own publisher" on public.publishers for update to authenticated using (auth.uid() = id);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid,
  title text not null,
  author text not null,
  description text not null default '',
  category text not null default 'عام',
  cover_url text,
  format book_format not null default 'digital',
  price_digital numeric(10,2),
  price_physical numeric(10,2),
  pages int,
  stock int not null default 0,
  file_path text,
  status book_status not null default 'pending',
  rejection_reason text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.books to anon;
grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;
create policy "approved books public" on public.books for select to anon, authenticated using (status = 'approved');
create policy "publisher reads own" on public.books for select to authenticated using (publisher_id = auth.uid());
create policy "admin reads all" on public.books for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "publisher inserts" on public.books for insert to authenticated
  with check (publisher_id = auth.uid() and status = 'pending' and featured = false and exists (select 1 from public.publishers p where p.id = auth.uid()));
create policy "publisher updates own" on public.books for update to authenticated
  using (publisher_id = auth.uid()) with check (publisher_id = auth.uid() and status = 'pending' and featured = false);
create policy "publisher deletes own" on public.books for delete to authenticated using (publisher_id = auth.uid());
create policy "admin updates" on public.books for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin deletes" on public.books for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  total numeric(10,2) not null default 0,
  status text not null default 'جديد',
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  created_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "buyer reads orders" on public.orders for select to authenticated using (buyer_id = auth.uid());
create policy "admin reads orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  format text not null check (format in ('digital','physical')),
  unit_price numeric(10,2) not null,
  quantity int not null default 1,
  created_at timestamptz not null default now()
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "buyer reads items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "publisher reads sales" on public.order_items for select to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.publisher_id = auth.uid()));
create policy "admin reads items" on public.order_items for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.place_order(_items jsonb, _name text, _phone text, _address text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  _order uuid; _it jsonb; _b public.books; _price numeric; _qty int; _total numeric := 0; _has_physical boolean := false;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'السلة فارغة'; end if;
  insert into public.orders (buyer_id, shipping_name, shipping_phone, shipping_address)
  values (auth.uid(), _name, _phone, _address) returning id into _order;
  for _it in select * from jsonb_array_elements(_items) loop
    select * into _b from public.books where id = (_it->>'book_id')::uuid and status = 'approved';
    if not found then raise exception 'كتاب غير متاح'; end if;
    if _it->>'format' = 'digital' then
      if _b.format = 'physical' or _b.price_digital is null then raise exception 'النسخة الرقمية غير متاحة'; end if;
      _price := _b.price_digital; _qty := 1;
    elsif _it->>'format' = 'physical' then
      if _b.format = 'digital' or _b.price_physical is null then raise exception 'النسخة الورقية غير متاحة'; end if;
      _qty := greatest(1, least(coalesce((_it->>'quantity')::int,1), 20));
      if _b.stock < _qty then raise exception 'الكمية غير متوفرة: %', _b.title; end if;
      update public.books set stock = stock - _qty where id = _b.id;
      _price := _b.price_physical; _has_physical := true;
    else raise exception 'صيغة غير صحيحة'; end if;
    insert into public.order_items (order_id, book_id, format, unit_price, quantity) values (_order, _b.id, _it->>'format', _price, _qty);
    _total := _total + _price * _qty;
  end loop;
  if _has_physical and (coalesce(_name,'') = '' or coalesce(_phone,'') = '' or coalesce(_address,'') = '') then
    raise exception 'بيانات الشحن مطلوبة';
  end if;
  update public.orders set total = _total where id = _order;
  return _order;
end; $$;
revoke execute on function public.place_order(jsonb,text,text,text) from anon, public;
grant execute on function public.place_order(jsonb,text,text,text) to authenticated;

create or replace function public.can_access_book_file(_path text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.books b where b.file_path = _path and (b.publisher_id = auth.uid() or public.has_role(auth.uid(),'admin')))
  or exists (select 1 from public.order_items oi join public.orders o on o.id = oi.order_id join public.books b on b.id = oi.book_id
             where b.file_path = _path and oi.format = 'digital' and o.buyer_id = auth.uid())
$$;

create policy "covers read" on storage.objects for select to anon, authenticated using (bucket_id = 'covers');
create policy "covers upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'book-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files read if allowed" on storage.objects for select to authenticated
  using (bucket_id = 'book-files' and public.can_access_book_file(name));

insert into public.books (title, author, description, category, cover_url, format, price_digital, price_physical, pages, stock, status, featured) values
('ظلال المدينة القديمة','سلمى الراشد','رواية تأخذك عبر أزقة مدينة عتيقة، حيث تتقاطع حكايات العائلات مع أسرار قرن كامل.','روايات','/covers/1.jpg','both',25,60,320,40,'approved',true),
('فن التفكير الهادئ','د. خالد منصور','دليل عملي لتنظيم الأفكار واتخاذ القرارات بوضوح في عالم سريع وصاخب.','تطوير الذات','/covers/2.jpg','digital',19,null,210,0,'approved',true),
('رحلة إلى النجوم','مازن العلي','كتاب علمي مبسط يشرح أسرار الكون والمجرات للقارئ الفضولي.','علوم','/covers/3.jpg','both',22,55,260,25,'approved',true),
('حديقة الكلمات','ليلى حسن','مجموعة شعرية تحتفي بالطبيعة والحب والذاكرة بلغة رقيقة.','شعر','/covers/4.jpg','physical',null,45,140,30,'approved',true),
('تاريخ طرق التجارة','د. عمر الفارس','قصة القوافل والموانئ التي ربطت الشرق بالغرب عبر العصور.','تاريخ','/covers/5.jpg','both',30,75,410,15,'approved',false),
('ريادة الأعمال من الصفر','نورة السالم','خطوات واضحة لبناء مشروعك الأول، من الفكرة إلى أول عميل.','أعمال','/covers/6.jpg','digital',29,null,230,0,'approved',false);
