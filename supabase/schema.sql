create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'employee');
  end if;

  if not exists (select 1 from pg_type where typname = 'operation_type') then
    create type public.operation_type as enum ('sell', 'rent');
  end if;

  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('available', 'sold', 'rented');
  end if;
end $$;

create sequence if not exists public.property_code_seq;
create sequence if not exists public.customer_code_seq start with 20000 increment by 1;

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
  can_add_customer boolean not null default true,
  can_edit_customer boolean not null default false,
  can_delete_customer boolean not null default false,
  can_view_mobile boolean not null default false,
  can_view_customer_mobile boolean not null default false,
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
  property_code text not null unique default ('KY-' || lpad(nextval('public.property_code_seq')::text, 5, '0')),
  status public.property_status not null default 'available',
  archived_at timestamptz,
  related_property_id uuid references public.properties(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique default (nextval('public.customer_code_seq')::text),
  customer_name text,
  mobile text not null,
  city text not null check (city in ('بدر', 'الشروق', 'مدينتي', 'العبور')),
  budget text not null,
  notes text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;
alter table public.users add column if not exists can_view_mobile boolean not null default false;
alter table public.users add column if not exists can_add_customer boolean not null default true;
alter table public.users add column if not exists can_edit_customer boolean not null default false;
alter table public.users add column if not exists can_delete_customer boolean not null default false;
alter table public.users add column if not exists can_view_customer_mobile boolean not null default false;
alter table public.properties add column if not exists property_code text;
alter table public.properties add column if not exists status public.property_status not null default 'available';
alter table public.properties add column if not exists archived_at timestamptz;
alter table public.properties add column if not exists related_property_id uuid references public.properties(id) on delete set null;
alter table public.customers add column if not exists customer_name text;

update public.properties
set property_code = 'KY-' || lpad(nextval('public.property_code_seq')::text, 5, '0')
where property_code is null or btrim(property_code) = '';

alter table public.properties
  alter column property_code set default ('KY-' || lpad(nextval('public.property_code_seq')::text, 5, '0'));
alter table public.properties alter column property_code set not null;

drop index if exists public.properties_mobile_unique_idx;
alter table public.properties drop constraint if exists properties_mobile_key;
create index if not exists properties_city_idx on public.properties(city);
create index if not exists properties_operation_idx on public.properties(operation);
create index if not exists properties_property_type_idx on public.properties(property_type);
create index if not exists properties_mobile_idx on public.properties(mobile);
create index if not exists properties_related_property_idx on public.properties(related_property_id);
create unique index if not exists properties_property_code_key on public.properties(property_code);
create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_archived_at_idx on public.properties(archived_at);
create unique index if not exists customers_customer_code_key on public.customers(customer_code);
create index if not exists customers_city_idx on public.customers(city);
create index if not exists customers_mobile_idx on public.customers(mobile);
create index if not exists customers_created_by_idx on public.customers(created_by);

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

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
before update on public.customers
for each row execute function public.touch_updated_at();

create or replace function public.sync_property_archive_state()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('sold', 'rented') and new.archived_at is null then
    new.archived_at = now();
  elsif new.status = 'available' then
    new.archived_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists properties_sync_archive_state on public.properties;
create trigger properties_sync_archive_state
before insert or update on public.properties
for each row execute function public.sync_property_archive_state();

create or replace function public.protect_user_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.email is distinct from new.email
    or old.role is distinct from new.role
    or old.can_add_employee is distinct from new.can_add_employee
    or old.can_edit_permissions is distinct from new.can_edit_permissions
    or old.can_delete_employee is distinct from new.can_delete_employee
    or old.can_add_property is distinct from new.can_add_property
    or old.can_edit_property is distinct from new.can_edit_property
    or old.can_delete_property is distinct from new.can_delete_property
    or old.can_add_customer is distinct from new.can_add_customer
    or old.can_edit_customer is distinct from new.can_edit_customer
    or old.can_delete_customer is distinct from new.can_delete_customer
    or old.can_view_mobile is distinct from new.can_view_mobile
    or old.can_view_customer_mobile is distinct from new.can_view_customer_mobile
    or old.can_view_all is distinct from new.can_view_all then
    raise exception 'Only admins can update roles and permissions.';
  end if;

  if old.auth_id is not null and old.auth_id is distinct from new.auth_id then
    raise exception 'Profile is already linked to another auth user.';
  end if;

  if new.auth_id is not null and new.auth_id <> auth.uid() then
    raise exception 'Profile can only be linked to the current auth user.';
  end if;

  return new;
end;
$$;

drop trigger if exists users_protect_permissions on public.users;
create trigger users_protect_permissions
before update on public.users
for each row execute function public.protect_user_permissions();

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

create or replace function public.can_view_customer_mobile()
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
      and (role = 'admin' or can_view_customer_mobile = true or can_view_all = true)
  );
$$;

drop function if exists public.get_properties();
create or replace function public.get_properties()
returns table (
  id uuid,
  operation public.operation_type,
  city text,
  property_type text,
  employee_name text,
  mobile text,
  description text,
  property_code text,
  status public.property_status,
  archived_at timestamptz,
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
    p.property_code,
    p.status,
    p.archived_at,
    p.related_property_id,
    p.created_by,
    p.created_at,
    p.updated_at
  from public.properties p
  order by p.created_at desc;
$$;

drop function if exists public.get_property_by_id(uuid);
create or replace function public.get_property_by_id(property_id uuid)
returns table (
  id uuid,
  operation public.operation_type,
  city text,
  property_type text,
  employee_name text,
  mobile text,
  description text,
  property_code text,
  status public.property_status,
  archived_at timestamptz,
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
    p.property_code,
    p.status,
    p.archived_at,
    p.related_property_id,
    p.created_by,
    p.created_at,
    p.updated_at
  from public.properties p
  where p.id = property_id
  limit 1;
$$;

drop function if exists public.find_property_by_mobile(text, uuid);
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
  property_code text,
  status public.property_status,
  archived_at timestamptz,
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
    p.property_code,
    p.status,
    p.archived_at,
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

drop function if exists public.get_customers();
create or replace function public.get_customers()
returns table (
  id uuid,
  customer_code text,
  customer_name text,
  mobile text,
  city text,
  budget text,
  notes text,
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
    c.id,
    c.customer_code,
    c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city,
    c.budget,
    c.notes,
    c.created_by,
    c.created_at,
    c.updated_at
  from public.customers c
  order by c.created_at desc;
$$;

drop function if exists public.get_customer_by_id(uuid);
create or replace function public.get_customer_by_id(customer_id uuid)
returns table (
  id uuid,
  customer_code text,
  customer_name text,
  mobile text,
  city text,
  budget text,
  notes text,
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
    c.id,
    c.customer_code,
    c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city,
    c.budget,
    c.notes,
    c.created_by,
    c.created_at,
    c.updated_at
  from public.customers c
  where c.id = customer_id
  limit 1;
$$;

alter table public.users enable row level security;
alter table public.properties enable row level security;
alter table public.customers enable row level security;

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
drop policy if exists "admins can create employee profiles" on public.users;
create policy "admins can create employee profiles"
on public.users for insert
to authenticated
with check (public.is_admin());

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

drop policy if exists "permitted users can read customers directly" on public.customers;
create policy "permitted users can read customers directly"
on public.customers for select
to authenticated
using (public.can_view_customer_mobile());

drop policy if exists "permitted users can insert customers" on public.customers;
create policy "permitted users can insert customers"
on public.customers for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_add_customer = true)
  )
);

drop policy if exists "permitted users can update customers" on public.customers;
create policy "permitted users can update customers"
on public.customers for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and can_edit_customer = true
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and can_edit_customer = true
  )
);

drop policy if exists "permitted users can delete customers" on public.customers;
create policy "permitted users can delete customers"
on public.customers for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.users
    where auth_id = auth.uid()
      and can_delete_customer = true
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
  can_add_customer,
  can_edit_customer,
  can_delete_customer,
  can_view_mobile,
  can_view_customer_mobile,
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
  can_add_customer = true,
  can_edit_customer = true,
  can_delete_customer = true,
  can_view_mobile = true,
  can_view_customer_mobile = true,
  can_view_all = true;
