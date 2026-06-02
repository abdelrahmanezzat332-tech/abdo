create sequence if not exists public.customer_code_seq start with 20000 increment by 1;

alter table public.users add column if not exists can_add_customer boolean not null default true;
alter table public.users add column if not exists can_edit_customer boolean not null default false;
alter table public.users add column if not exists can_delete_customer boolean not null default false;
alter table public.users add column if not exists can_view_customer_mobile boolean not null default false;

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

alter table public.customers add column if not exists customer_name text;

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

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
before update on public.customers
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

create or replace function public.protect_user_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

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

alter table public.customers enable row level security;

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

update public.users
set
  can_add_customer = true,
  can_edit_customer = true,
  can_delete_customer = true,
  can_view_customer_mobile = true
where lower(email) = 'abdelrahmanezzat332@gmail.com'
   or role = 'admin';
