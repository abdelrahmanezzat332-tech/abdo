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

-- ── Sequences ────────────────────────────────────────────────────────────────
create sequence if not exists public.property_sell_seq;
create sequence if not exists public.property_rent_seq;
create sequence if not exists public.customer_code_seq start with 20000 increment by 1;

-- ── Migrate old sequence (keep existing, no data lost) ───────────────────────
create sequence if not exists public.property_code_seq;

do $$
begin
  if exists (
    select 1 from pg_enum
    where enumtypid = 'public.operation_type'::regtype
      and enumlabel = 'buy'
  ) and not exists (
    select 1 from pg_enum
    where enumtypid = 'public.operation_type'::regtype
      and enumlabel = 'rent'
  ) then
    alter type public.operation_type rename value 'buy' to 'rent';
  end if;
end $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
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
  city text not null check (length(btrim(city)) > 0),
  property_type text not null check (property_type in ('شقق', 'فلل', 'عمارات', 'محلات', 'استوديو', 'دوبلكس', 'أراضي', 'إداري', 'تجاري', 'أخرى')),
  employee_name text not null,
  mobile text not null,
  description text not null,
  price text not null default '',
  -- Code format: KY-S-00001 for sell, KY-R-00001 for rent
  property_code text not null unique,
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
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Add missing columns (idempotent) ────────────────────────────────────────
alter table public.users add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;
alter table public.users add column if not exists can_view_mobile boolean not null default false;
alter table public.users add column if not exists can_add_customer boolean not null default true;
alter table public.users add column if not exists can_edit_customer boolean not null default false;
alter table public.users add column if not exists can_delete_customer boolean not null default false;
alter table public.users add column if not exists can_view_customer_mobile boolean not null default false;

alter table public.properties add column if not exists property_code text;
alter table public.properties add column if not exists price text not null default '';
alter table public.properties add column if not exists status public.property_status not null default 'available';
alter table public.properties add column if not exists archived_at timestamptz;
alter table public.properties add column if not exists related_property_id uuid references public.properties(id) on delete set null;

alter table public.customers add column if not exists customer_code text;
alter table public.customers add column if not exists customer_name text;
alter table public.customers add column if not exists mobile text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists budget text;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists archived_at timestamptz;
alter table public.customers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

-- ── Back-fill property_code for old rows without a code ─────────────────────
update public.properties
set property_code =
  case operation
    when 'sell' then 'KY-S-' || lpad(nextval('public.property_sell_seq')::text, 5, '0')
    else              'KY-R-' || lpad(nextval('public.property_rent_seq')::text, 5, '0')
  end
where property_code is null or btrim(property_code) = '';

alter table public.properties alter column property_code set not null;

-- Back-fill customer_code
update public.customers
set customer_code = nextval('public.customer_code_seq')::text
where customer_code is null or btrim(customer_code) = '';

alter table public.customers
  alter column customer_code set default (nextval('public.customer_code_seq')::text);
alter table public.customers alter column customer_code set not null;

-- ── Indexes ──────────────────────────────────────────────────────────────────
drop index if exists public.properties_mobile_unique_idx;
alter table public.properties drop constraint if exists properties_mobile_key;

create index if not exists properties_city_idx          on public.properties(city);
create index if not exists properties_operation_idx     on public.properties(operation);
create index if not exists properties_property_type_idx on public.properties(property_type);
create index if not exists properties_mobile_idx        on public.properties(mobile);
create index if not exists properties_related_property_idx on public.properties(related_property_id);
create unique index if not exists properties_property_code_key on public.properties(property_code);
create index if not exists properties_status_idx        on public.properties(status);
create index if not exists properties_archived_at_idx   on public.properties(archived_at);

create unique index if not exists customers_customer_code_key on public.customers(customer_code);
create index if not exists customers_city_idx       on public.customers(city);
create index if not exists customers_mobile_idx     on public.customers(mobile);
create index if not exists customers_created_by_idx on public.customers(created_by);
create index if not exists customers_archived_at_idx on public.customers(archived_at);

-- ── Triggers: updated_at ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at      on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists properties_touch_updated_at on public.properties;
create trigger properties_touch_updated_at
before update on public.properties
for each row execute function public.touch_updated_at();

drop trigger if exists customers_touch_updated_at  on public.customers;
create trigger customers_touch_updated_at
before update on public.customers
for each row execute function public.touch_updated_at();

-- ── Trigger: sync archived_at for properties ────────────────────────────────
create or replace function public.sync_property_archive_state()
returns trigger language plpgsql as $$
begin
  if new.status in ('sold', 'rented') and new.archived_at is null then
    new.archived_at = now();
  elsif TG_OP = 'INSERT' and new.status = 'available' then
    new.archived_at = null;
  elsif TG_OP = 'UPDATE' and new.status = 'available' and old.status is distinct from new.status then
    new.archived_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_sync_archive_state on public.properties;
create trigger properties_sync_archive_state
before insert or update on public.properties
for each row execute function public.sync_property_archive_state();

-- ── Trigger: sync archived_at for customers ─────────────────────────────────
create or replace function public.sync_customer_archive_state()
returns trigger language plpgsql as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    -- being archived now — nothing extra needed
    null;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_sync_archive_state on public.customers;
create trigger customers_sync_archive_state
before update on public.customers
for each row execute function public.sync_customer_archive_state();

-- ── Trigger: regenerate property_code on operation change ───────────────────
-- When a property's operation changes (rent ↔ sell) assign a fresh code
-- matching the new operation prefix. The old code is replaced atomically.
create or replace function public.sync_property_code_on_operation_change()
returns trigger language plpgsql as $$
begin
  if new.operation <> old.operation then
    new.property_code :=
      case new.operation
        when 'sell' then 'KY-S-' || lpad(nextval('public.property_sell_seq')::text, 5, '0')
        else             'KY-R-' || lpad(nextval('public.property_rent_seq')::text, 5, '0')
      end;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_sync_code_on_operation on public.properties;
create trigger properties_sync_code_on_operation
before update on public.properties
for each row execute function public.sync_property_code_on_operation_change();

-- ── Trigger: assign correct code prefix on INSERT ───────────────────────────
create or replace function public.assign_property_code_on_insert()
returns trigger language plpgsql as $$
begin
  -- always assign a fresh sequenced code on insert (ignore any supplied value)
  new.property_code :=
    case new.operation
      when 'sell' then 'KY-S-' || lpad(nextval('public.property_sell_seq')::text, 5, '0')
      else             'KY-R-' || lpad(nextval('public.property_rent_seq')::text, 5, '0')
    end;
  return new;
end;
$$;

drop trigger if exists properties_assign_code_on_insert on public.properties;
create trigger properties_assign_code_on_insert
before insert on public.properties
for each row execute function public.assign_property_code_on_insert();

-- ── Permissions helpers ──────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_view_mobile()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_view_mobile = true or can_view_all = true)
  );
$$;

create or replace function public.can_view_customer_mobile()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_view_customer_mobile = true or can_view_all = true)
  );
$$;

-- ── protect_user_permissions ─────────────────────────────────────────────────
create or replace function public.protect_user_permissions()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then return new; end if;
  if public.is_admin() then return new; end if;

  -- non-admin can only update their own non-permission fields
  if new.id <> old.id then raise exception 'Cannot change user id.'; end if;
  new.role                  := old.role;
  new.can_add_employee      := old.can_add_employee;
  new.can_edit_permissions  := old.can_edit_permissions;
  new.can_delete_employee   := old.can_delete_employee;
  new.can_add_property      := old.can_add_property;
  new.can_edit_property     := old.can_edit_property;
  new.can_delete_property   := old.can_delete_property;
  new.can_add_customer      := old.can_add_customer;
  new.can_edit_customer     := old.can_edit_customer;
  new.can_delete_customer   := old.can_delete_customer;
  new.can_view_mobile       := old.can_view_mobile;
  new.can_view_customer_mobile := old.can_view_customer_mobile;
  new.can_view_all          := old.can_view_all;
  return new;
end;
$$;

drop trigger if exists users_protect_permissions on public.users;
create trigger users_protect_permissions
before update on public.users
for each row execute function public.protect_user_permissions();

-- ── get_properties ───────────────────────────────────────────────────────────
drop function if exists public.get_properties();
create or replace function public.get_properties()
returns table (
  id uuid, property_code text, operation public.operation_type,
  city text, property_type text, employee_name text, mobile text,
  description text, price text,
  status public.property_status, archived_at timestamptz,
  related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.property_code, p.operation,
    p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end as mobile,
    p.description,
    p.price,
    p.status, p.archived_at,
    p.related_property_id, p.created_by,
    p.created_at, p.updated_at
  from public.properties p
  where auth.uid() is not null
  order by p.created_at desc;
$$;

-- ── get_property_by_id ───────────────────────────────────────────────────────
drop function if exists public.get_property_by_id(uuid);
create or replace function public.get_property_by_id(p_property_id uuid)
returns table (
  id uuid, property_code text, operation public.operation_type,
  city text, property_type text, employee_name text, mobile text,
  description text, price text,
  status public.property_status, archived_at timestamptz,
  related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.property_code, p.operation,
    p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end as mobile,
    p.description,
    p.price,
    p.status, p.archived_at,
    p.related_property_id, p.created_by,
    p.created_at, p.updated_at
  from public.properties p
  where auth.uid() is not null
    and p.id = p_property_id
  limit 1;
$$;

-- ── find_property_by_mobile ──────────────────────────────────────────────────
drop function if exists public.find_property_by_mobile(text, uuid);
create or replace function public.find_property_by_mobile(
  lookup_mobile text,
  excluded_property_id uuid default null
)
returns table (
  id uuid, property_code text, operation public.operation_type,
  city text, property_type text, employee_name text, mobile text,
  description text, price text,
  status public.property_status, archived_at timestamptz,
  related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.property_code, p.operation,
    p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end as mobile,
    p.description,
    p.price,
    p.status, p.archived_at,
    p.related_property_id, p.created_by,
    p.created_at, p.updated_at
  from public.properties p
  where auth.uid() is not null
    and p.mobile = lookup_mobile
    and (excluded_property_id is null or p.id <> excluded_property_id)
    and p.status = 'available'
  limit 1;
$$;

-- ── update_property ──────────────────────────────────────────────────────────
drop function if exists public.update_property(uuid, public.operation_type, text, text, text, text, boolean, text, public.property_status, uuid);
drop function if exists public.update_property(uuid, public.operation_type, text, text, text, text, boolean, text, text, public.property_status, uuid);
create or replace function public.update_property(
  p_property_id          uuid,
  p_operation            public.operation_type,
  p_city                 text,
  p_property_type        text,
  p_employee_name        text,
  p_mobile               text,
  p_keep_existing_mobile boolean,
  p_description          text,
  p_price                text,
  p_status               public.property_status,
  p_related_property_id  uuid default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_property = true)
  ) then
    raise exception 'You do not have permission to edit properties.';
  end if;

  if not p_keep_existing_mobile and (p_mobile is null or btrim(p_mobile) = '') then
    raise exception 'Mobile number is required.';
  end if;

  -- Note: property_code update is handled automatically by the trigger
  -- sync_property_code_on_operation_change when operation changes.
  update public.properties as target
  set
    operation            = p_operation,
    city                 = p_city,
    property_type        = p_property_type,
    employee_name        = btrim(p_employee_name),
    mobile               = case when p_keep_existing_mobile then target.mobile else p_mobile end,
    description          = btrim(p_description),
    price                = btrim(p_price),
    status               = p_status,
    related_property_id  = p_related_property_id
  where target.id = p_property_id;

  if not found then
    raise exception 'Property was not found.';
  end if;
end;
$$;

-- ── archive_property / unarchive_property ───────────────────────────────────
drop function if exists public.archive_property(uuid);
create or replace function public.archive_property(p_property_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_property = true)
  ) then raise exception 'You do not have permission to archive properties.'; end if;

  update public.properties
  set archived_at = now()
  where id = p_property_id and archived_at is null;

  if not found then raise exception 'Property not found or already archived.'; end if;
end;
$$;

drop function if exists public.unarchive_property(uuid);
create or replace function public.unarchive_property(p_property_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_property = true)
  ) then raise exception 'You do not have permission to unarchive properties.'; end if;

  update public.properties
  set status = 'available',
      archived_at = null
  where id = p_property_id
    and (archived_at is not null or status in ('sold', 'rented'));

  if not found then raise exception 'Property not found or not archived.'; end if;
end;
$$;

-- ── delete_property ──────────────────────────────────────────────────────────
drop function if exists public.delete_property(uuid);
create or replace function public.delete_property(p_property_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_delete_property = true)
  ) then raise exception 'You do not have permission to delete properties.'; end if;

  delete from public.properties where id = p_property_id;
  if not found then raise exception 'Property was not found.'; end if;
end;
$$;

-- ── get_customers (active only) ──────────────────────────────────────────────
drop function if exists public.get_customers();
create or replace function public.get_customers()
returns table (
  id uuid, customer_code text, customer_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    c.id, c.customer_code, c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city, c.budget, c.notes,
    c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null
    and c.archived_at is null
  order by c.created_at desc;
$$;

-- ── get_archived_customers ───────────────────────────────────────────────────
drop function if exists public.get_archived_customers();
create or replace function public.get_archived_customers()
returns table (
  id uuid, customer_code text, customer_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    c.id, c.customer_code, c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city, c.budget, c.notes,
    c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null
    and c.archived_at is not null
  order by c.archived_at desc;
$$;

-- ── get_customer_by_id ───────────────────────────────────────────────────────
drop function if exists public.get_customer_by_id(uuid);
create or replace function public.get_customer_by_id(p_customer_id uuid)
returns table (
  id uuid, customer_code text, customer_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    c.id, c.customer_code, c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city, c.budget, c.notes,
    c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null
    and c.id = p_customer_id
  limit 1;
$$;

-- ── update_customer ──────────────────────────────────────────────────────────
drop function if exists public.update_customer(uuid, text, text, boolean, text, text, text);
create or replace function public.update_customer(
  p_customer_id          uuid,
  p_customer_name        text,
  p_mobile               text,
  p_keep_existing_mobile boolean,
  p_city                 text,
  p_budget               text,
  p_notes                text
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_customer = true)
  ) then raise exception 'You do not have permission to edit customers.'; end if;

  if not p_keep_existing_mobile and (p_mobile is null or btrim(p_mobile) = '') then
    raise exception 'Mobile number is required.';
  end if;

  update public.customers as target
  set
    customer_name = nullif(btrim(coalesce(p_customer_name, '')), ''),
    mobile        = case when p_keep_existing_mobile then target.mobile else p_mobile end,
    city          = p_city,
    budget        = btrim(p_budget),
    notes         = btrim(p_notes)
  where target.id = p_customer_id;

  if not found then raise exception 'Customer was not found.'; end if;
end;
$$;

-- ── archive_customer / unarchive_customer ────────────────────────────────────
drop function if exists public.archive_customer(uuid);
create or replace function public.archive_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_customer = true)
  ) then raise exception 'You do not have permission to archive customers.'; end if;

  update public.customers
  set archived_at = now()
  where id = p_customer_id and archived_at is null;

  if not found then raise exception 'Customer not found or already archived.'; end if;
end;
$$;

drop function if exists public.unarchive_customer(uuid);
create or replace function public.unarchive_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_customer = true)
  ) then raise exception 'You do not have permission to unarchive customers.'; end if;

  update public.customers
  set archived_at = null
  where id = p_customer_id and archived_at is not null;

  if not found then raise exception 'Customer not found or not archived.'; end if;
end;
$$;

-- ── delete_customer ──────────────────────────────────────────────────────────
drop function if exists public.delete_customer(uuid);
create or replace function public.delete_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_delete_customer = true)
  ) then raise exception 'You do not have permission to delete customers.'; end if;

  delete from public.customers where id = p_customer_id;
  if not found then raise exception 'Customer was not found.'; end if;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.users       enable row level security;
alter table public.properties  enable row level security;
alter table public.customers   enable row level security;

drop policy if exists "users can read own profile or admins read all" on public.users;
create policy "users can read own profile or admins read all"
on public.users for select to authenticated
using (auth_id = auth.uid() or email = (auth.jwt() ->> 'email') or public.is_admin());

drop policy if exists "admins can create employee profiles" on public.users;
create policy "admins can create employee profiles"
on public.users for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins and owners can update profiles" on public.users;
create policy "admins and owners can update profiles"
on public.users for update to authenticated
using  (public.is_admin() or email = (auth.jwt() ->> 'email'))
with check (public.is_admin() or (auth_id = auth.uid() and email = (auth.jwt() ->> 'email')));

drop policy if exists "admins can delete employees" on public.users;
create policy "admins can delete employees"
on public.users for delete to authenticated
using (public.is_admin());

drop policy if exists "permitted users can read properties directly" on public.properties;
create policy "permitted users can read properties directly"
on public.properties for select to authenticated
using (public.can_view_mobile());

drop policy if exists "permitted users can insert properties" on public.properties;
create policy "permitted users can insert properties"
on public.properties for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_add_property = true)
  )
);

drop policy if exists "permitted users can update properties" on public.properties;
create policy "permitted users can update properties"
on public.properties for update to authenticated
using  (public.is_admin() or exists (select 1 from public.users where auth_id = auth.uid() and can_edit_property = true))
with check (public.is_admin() or exists (select 1 from public.users where auth_id = auth.uid() and can_edit_property = true));

drop policy if exists "permitted users can delete properties" on public.properties;
create policy "permitted users can delete properties"
on public.properties for delete to authenticated
using  (public.is_admin() or exists (select 1 from public.users where auth_id = auth.uid() and can_delete_property = true));

drop policy if exists "permitted users can read customers directly" on public.customers;
create policy "permitted users can read customers directly"
on public.customers for select to authenticated
using (public.can_view_customer_mobile());

drop policy if exists "permitted users can insert customers" on public.customers;
create policy "permitted users can insert customers"
on public.customers for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_add_customer = true)
  )
);

drop policy if exists "permitted users can update customers" on public.customers;
create policy "permitted users can update customers"
on public.customers for update to authenticated
using  (public.is_admin() or exists (select 1 from public.users where auth_id = auth.uid() and can_edit_customer = true))
with check (public.is_admin() or exists (select 1 from public.users where auth_id = auth.uid() and can_edit_customer = true));

drop policy if exists "permitted users can delete customers" on public.customers;
create policy "permitted users can delete customers"
on public.customers for delete to authenticated
using  (public.is_admin() or exists (select 1 from public.users where auth_id = auth.uid() and can_delete_customer = true));

-- ── Admin seed ───────────────────────────────────────────────────────────────
insert into public.users (
  full_name, email, role,
  can_add_employee, can_edit_permissions, can_delete_employee,
  can_add_property, can_edit_property, can_delete_property,
  can_add_customer, can_edit_customer, can_delete_customer,
  can_view_mobile, can_view_customer_mobile, can_view_all
)
values (
  'Abdelrahman', 'abdelrahmanezzat332@gmail.com', 'admin',
  true, true, true, true, true, true, true, true, true, true, true, true
)
on conflict (email) do update set
  full_name = excluded.full_name, role = 'admin',
  can_add_employee = true, can_edit_permissions = true, can_delete_employee = true,
  can_add_property = true, can_edit_property = true, can_delete_property = true,
  can_add_customer = true, can_edit_customer = true, can_delete_customer = true,
  can_view_mobile = true, can_view_customer_mobile = true, can_view_all = true;
