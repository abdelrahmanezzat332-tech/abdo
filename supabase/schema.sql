create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'employee');
  end if;

  if not exists (select 1 from pg_type where typname = 'operation_type') then
    create type public.operation_type as enum ('sell', 'rent');
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_enum
    where enumtypid = 'public.operation_type'::regtype
      and enumlabel = 'buy'
  ) and not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.operation_type'::regtype
      and enumlabel = 'rent'
  ) then
    alter type public.operation_type rename value 'buy' to 'rent';
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'employee',
  can_add_employee boolean not null default false,
  can_edit_permissions boolean not null default false,
  can_delete_employee boolean not null default false,
  can_add_property boolean not null default true,
  can_edit_property boolean not null default false,
  can_delete_property boolean not null default false,
  can_view_mobile boolean not null default false,
  can_view_all boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  operation public.operation_type not null,
  city text not null check (city in ('بدر', 'الشروق', 'مدينتي', 'العبور')),
  property_type text not null check (property_type in ('شقق', 'فلل', 'عمارات', 'محلات', 'استوديو', 'دوبلكس', 'أراضي', 'إداري', 'تجاري', 'أخرى')),
  employee_name text not null,
  mobile text not null,
  description text not null,
  related_property_id uuid references public.properties(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;
alter table public.users add column if not exists can_view_mobile boolean not null default false;
alter table public.properties add column if not exists related_property_id uuid references public.properties(id) on delete set null;

drop index if exists public.properties_mobile_unique_idx;
alter table public.properties drop constraint if exists properties_mobile_key;
create index if not exists properties_city_idx on public.properties(city);
create index if not exists properties_operation_idx on public.properties(operation);
create index if not exists properties_property_type_idx on public.properties(property_type);
create index if not exists properties_mobile_idx on public.properties(mobile);
create index if not exists properties_related_property_idx on public.properties(related_property_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists properties_touch_updated_at on public.properties;
create trigger properties_touch_updated_at
before update on public.properties
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.can_view_mobile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_view_mobile = true or can_view_all = true)
  );
$$;

create or replace function public.get_properties()
returns table (
  id uuid,
  operation public.operation_type,
  city text,
  property_type text,
  employee_name text,
  mobile text,
  description text,
  related_property_id uuid,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.operation,
    p.city,
    p.property_type,
    p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end as mobile,
    p.description,
    p.related_property_id,
    p.created_by,
    p.created_at,
    p.updated_at
  from public.properties p
  order by p.created_at desc;
$$;

create or replace function public.get_property_by_id(property_id uuid)
returns table (
  id uuid,
  operation public.operation_type,
  city text,
  property_type text,
  employee_name text,
  mobile text,
  description text,
  related_property_id uuid,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.operation,
    p.city,
    p.property_type,
    p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end as mobile,
    p.description,
    p.related_property_id,
    p.created_by,
    p.created_at,
    p.updated_at
  from public.properties p
  where p.id = property_id
  limit 1;
$$;

create or replace function public.find_property_by_mobile(
  lookup_mobile text,
  excluded_property_id uuid default null
)
returns table (
  id uuid,
  operation public.operation_type,
  city text,
  property_type text,
  employee_name text,
  mobile text,
  description text,
  related_property_id uuid,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.operation,
    p.city,
    p.property_type,
    p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end as mobile,
    p.description,
    p.related_property_id,
    p.created_by,
    p.created_at,
    p.updated_at
  from public.properties p
  where p.mobile = lookup_mobile
    and (excluded_property_id is null or p.id <> excluded_property_id)
  order by p.created_at asc
  limit 1;
$$;

alter table public.users enable row level security;
alter table public.properties enable row level security;

drop policy if exists "users can read own profile or admins read all" on public.users;
create policy "users can read own profile or admins read all"
on public.users for select
to authenticated
using (
  auth_id = auth.uid()
  or email = (auth.jwt() ->> 'email')
  or public.is_admin()
);

drop policy if exists "users can create their own profile" on public.users;
create policy "users can create their own profile"
on public.users for insert
to authenticated
with check (
  public.is_admin()
  or (auth_id = auth.uid() and email = (auth.jwt() ->> 'email'))
);

drop policy if exists "admins and owners can update profiles" on public.users;
create policy "admins and owners can update profiles"
on public.users for update
to authenticated
using (
  public.is_admin()
  or email = (auth.jwt() ->> 'email')
)
with check (
  public.is_admin()
  or (auth_id = auth.uid() and email = (auth.jwt() ->> 'email'))
);

drop policy if exists "admins can delete employees" on public.users;
create policy "admins can delete employees"
on public.users for delete
to authenticated
using (public.is_admin());

drop policy if exists "authenticated users can read properties" on public.properties;
drop policy if exists "permitted users can read properties directly" on public.properties;
create policy "permitted users can read properties directly"
on public.properties for select
to authenticated
using (public.can_view_mobile());

drop policy if exists "permitted users can insert properties" on public.properties;
create policy "permitted users can insert properties"
on public.properties for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_add_property = true)
  )
);

drop policy if exists "permitted users can update properties" on public.properties;
create policy "permitted users can update properties"
on public.properties for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and can_edit_property = true
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and can_edit_property = true
  )
);

drop policy if exists "permitted users can delete properties" on public.properties;
create policy "permitted users can delete properties"
on public.properties for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and can_delete_property = true
  )
);

insert into public.users (
  full_name,
  email,
  role,
  can_add_employee,
  can_edit_permissions,
  can_delete_employee,
  can_add_property,
  can_edit_property,
  can_delete_property,
  can_view_mobile,
  can_view_all
)
values (
  'Abdelrahman',
  'abdelrahmanezzat332@gmail.com',
  'admin',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
)
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = 'admin',
  can_add_employee = true,
  can_edit_permissions = true,
  can_delete_employee = true,
  can_add_property = true,
  can_edit_property = true,
  can_delete_property = true,
  can_view_mobile = true,
  can_view_all = true;
