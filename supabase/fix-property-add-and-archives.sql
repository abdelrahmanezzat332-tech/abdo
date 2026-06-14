do $$
begin
  if not exists (select 1 from pg_type where typname = 'operation_type') then
    create type public.operation_type as enum ('sell', 'rent');
  end if;

  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('available', 'sold', 'rented');
  end if;
end $$;

create sequence if not exists public.property_sell_seq;
create sequence if not exists public.property_rent_seq;
create sequence if not exists public.customer_code_seq start with 20000 increment by 1;

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

update public.properties
set property_code =
  case operation
    when 'sell' then 'KY-S-' || lpad(nextval('public.property_sell_seq')::text, 5, '0')
    else              'KY-R-' || lpad(nextval('public.property_rent_seq')::text, 5, '0')
  end
where property_code is null or btrim(property_code) = '';

update public.customers
set customer_code = nextval('public.customer_code_seq')::text
where customer_code is null or btrim(customer_code) = '';

alter table public.properties alter column property_code set not null;
alter table public.customers alter column customer_code set default (nextval('public.customer_code_seq')::text);
alter table public.customers alter column customer_code set not null;

create unique index if not exists properties_property_code_key on public.properties(property_code);
create unique index if not exists customers_customer_code_key on public.customers(customer_code);
create index if not exists properties_archived_at_idx on public.properties(archived_at);
create index if not exists customers_archived_at_idx on public.customers(archived_at);

do $$
declare
  city_constraint record;
begin
  for city_constraint in
    select pc.conname
    from pg_constraint pc
    where pc.conrelid = 'public.properties'::regclass
      and pc.contype = 'c'
      and pg_get_constraintdef(pc.oid) ilike '%city%'
  loop
    execute format('alter table public.properties drop constraint if exists %I', city_constraint.conname);
  end loop;
end $$;

update public.properties
set city = 'غير محدد'
where city is null or btrim(city) = '';

alter table public.properties alter column city set not null;

alter table public.properties drop constraint if exists properties_city_not_blank_check;

alter table public.properties
  add constraint properties_city_not_blank_check
  check (length(btrim(city)) > 0);

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

create or replace function public.assign_property_code_on_insert()
returns trigger language plpgsql as $$
begin
  if new.property_code is null or btrim(new.property_code) = '' then
    new.property_code :=
      case new.operation
        when 'sell' then 'KY-S-' || lpad(nextval('public.property_sell_seq')::text, 5, '0')
        else             'KY-R-' || lpad(nextval('public.property_rent_seq')::text, 5, '0')
      end;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_assign_code_on_insert on public.properties;
create trigger properties_assign_code_on_insert
before insert on public.properties
for each row execute function public.assign_property_code_on_insert();

drop function if exists public.create_property(public.operation_type, text, text, text, text, text, text, public.property_status, uuid);
create or replace function public.create_property(
  p_operation public.operation_type,
  p_city text,
  p_property_type text,
  p_employee_name text,
  p_mobile text,
  p_description text,
  p_price text,
  p_status public.property_status default 'available',
  p_related_property_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_property_id uuid;
  v_property_code text;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_add_property = true)
  ) then raise exception 'You do not have permission to add properties.'; end if;

  if p_city is null or btrim(p_city) = '' then raise exception 'City is required.'; end if;
  if p_mobile is null or btrim(p_mobile) = '' then raise exception 'Mobile number is required.'; end if;
  if p_employee_name is null or btrim(p_employee_name) = '' then raise exception 'Employee name is required.'; end if;
  if p_description is null or btrim(p_description) = '' then raise exception 'Description is required.'; end if;

  v_property_code :=
    case p_operation
      when 'sell' then 'KY-S-' || lpad(nextval('public.property_sell_seq')::text, 5, '0')
      else             'KY-R-' || lpad(nextval('public.property_rent_seq')::text, 5, '0')
    end;

  insert into public.properties (
    operation, city, property_type, employee_name, mobile,
    description, price, status, related_property_id, created_by, property_code
  )
  values (
    p_operation, btrim(p_city), p_property_type, btrim(p_employee_name), p_mobile,
    btrim(p_description), btrim(coalesce(p_price, '')), coalesce(p_status, 'available'),
    p_related_property_id, auth.uid(), v_property_code
  )
  returning id into v_property_id;

  return v_property_id;
end;
$$;

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
    and p.archived_at is null
  limit 1;
$$;

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

notify pgrst, 'reload schema';
