-- ══════════════════════════════════════════════════════════════════════
-- Migration v2 — run this on existing databases
-- Adds: price column, per-operation code sequences, customer archived_at
-- ══════════════════════════════════════════════════════════════════════

-- 1. New sequences for operation-specific codes
create sequence if not exists public.property_sell_seq;
create sequence if not exists public.property_rent_seq;

-- 2. Price column on properties
alter table public.properties add column if not exists price text not null default '';

-- 3. archived_at on customers
alter table public.customers add column if not exists archived_at timestamptz;
create index if not exists customers_archived_at_idx on public.customers(archived_at);

-- 4. Re-prefix existing property codes to match new format
--    KY-00001 → KY-S-00001 (sell) or KY-R-00001 (rent)
update public.properties
set property_code =
  case operation
    when 'sell' then regexp_replace(property_code, '^KY-', 'KY-S-')
    else             regexp_replace(property_code, '^KY-', 'KY-R-')
  end
where property_code not like 'KY-S-%'
  and property_code not like 'KY-R-%';

-- 5. Trigger: regenerate code when operation changes
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

-- 6. Trigger: assign correct code on INSERT
create or replace function public.assign_property_code_on_insert()
returns trigger language plpgsql as $$
begin
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

-- 7. Trigger: sync archived_at on customers
create or replace function public.sync_customer_archive_state()
returns trigger language plpgsql as $$
begin
  return new;
end;
$$;

drop trigger if exists customers_sync_archive_state on public.customers;
create trigger customers_sync_archive_state
before update on public.customers
for each row execute function public.sync_customer_archive_state();

-- 8. Archive / Unarchive customer functions
drop function if exists public.archive_customer(uuid);
create or replace function public.archive_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid() and (role = 'admin' or can_edit_customer = true)
  ) then raise exception 'You do not have permission to archive customers.'; end if;

  update public.customers set archived_at = now()
  where id = p_customer_id and archived_at is null;
  if not found then raise exception 'Customer not found or already archived.'; end if;
end;
$$;

drop function if exists public.unarchive_customer(uuid);
create or replace function public.unarchive_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid() and (role = 'admin' or can_edit_customer = true)
  ) then raise exception 'You do not have permission to unarchive customers.'; end if;

  update public.customers set archived_at = null
  where id = p_customer_id and archived_at is not null;
  if not found then raise exception 'Customer not found or not archived.'; end if;
end;
$$;

-- 9. get_archived_customers function
drop function if exists public.get_archived_customers();
create or replace function public.get_archived_customers()
returns table (
  id uuid, customer_code text, customer_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.customer_code, c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end,
    c.city, c.budget, c.notes, c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null and c.archived_at is not null
  order by c.archived_at desc;
$$;

-- 10. Update get_customers to exclude archived
drop function if exists public.get_customers();
create or replace function public.get_customers()
returns table (
  id uuid, customer_code text, customer_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.customer_code, c.customer_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end,
    c.city, c.budget, c.notes, c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null and c.archived_at is null
  order by c.created_at desc;
$$;

-- 11. Update get_properties / get_property_by_id to include price
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
language sql stable security definer set search_path = public as $$
  select p.id, p.property_code, p.operation, p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end,
    p.description, p.price, p.status, p.archived_at,
    p.related_property_id, p.created_by, p.created_at, p.updated_at
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
language sql stable security definer set search_path = public as $$
  select p.id, p.property_code, p.operation, p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end,
    p.description, p.price, p.status, p.archived_at,
    p.related_property_id, p.created_by, p.created_at, p.updated_at
  from public.properties p
  where auth.uid() is not null and p.id = p_property_id
  limit 1;
$$;

-- 12. Update update_property to accept price
drop function if exists public.update_property(uuid, public.operation_type, text, text, text, text, boolean, text, public.property_status, uuid);
drop function if exists public.update_property(uuid, public.operation_type, text, text, text, text, boolean, text, text, public.property_status, uuid);
create or replace function public.update_property(
  p_property_id uuid, p_operation public.operation_type,
  p_city text, p_property_type text, p_employee_name text,
  p_mobile text, p_keep_existing_mobile boolean,
  p_description text, p_price text,
  p_status public.property_status, p_related_property_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid() and (role = 'admin' or can_edit_property = true)
  ) then raise exception 'You do not have permission to edit properties.'; end if;
  if not p_keep_existing_mobile and (p_mobile is null or btrim(p_mobile) = '') then
    raise exception 'Mobile number is required.';
  end if;

  -- property_code update is handled by trigger on operation change
  update public.properties as target set
    operation           = p_operation,
    city                = p_city,
    property_type       = p_property_type,
    employee_name       = btrim(p_employee_name),
    mobile              = case when p_keep_existing_mobile then target.mobile else p_mobile end,
    description         = btrim(p_description),
    price               = btrim(p_price),
    status              = p_status,
    related_property_id = p_related_property_id
  where target.id = p_property_id;

  if not found then raise exception 'Property was not found.'; end if;
end;
$$;
