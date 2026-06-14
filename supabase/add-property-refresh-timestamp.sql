alter table public.properties add column if not exists last_refreshed_at timestamptz;

drop function if exists public.get_properties();
create or replace function public.get_properties()
returns table (
  id uuid, property_code text, operation public.operation_type,
  city text, property_type text, employee_name text, mobile text,
  description text, price text,
  status public.property_status, is_partial boolean,
  availability_type text, availability_other text,
  archived_at timestamptz, related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz, last_refreshed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.property_code, p.operation,
    p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end,
    p.description, p.price, p.status, p.is_partial,
    p.availability_type, p.availability_other,
    p.archived_at, p.related_property_id, p.created_by,
    p.created_at, p.updated_at, p.last_refreshed_at
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
  status public.property_status, is_partial boolean,
  availability_type text, availability_other text,
  archived_at timestamptz, related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz, last_refreshed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.property_code, p.operation,
    p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end,
    p.description, p.price, p.status, p.is_partial,
    p.availability_type, p.availability_other,
    p.archived_at, p.related_property_id, p.created_by,
    p.created_at, p.updated_at, p.last_refreshed_at
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
  status public.property_status, is_partial boolean,
  availability_type text, availability_other text,
  archived_at timestamptz, related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz, last_refreshed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.property_code, p.operation,
    p.city, p.property_type, p.employee_name,
    case when public.can_view_mobile() then p.mobile else '' end,
    p.description, p.price, p.status, p.is_partial,
    p.availability_type, p.availability_other,
    p.archived_at, p.related_property_id, p.created_by,
    p.created_at, p.updated_at, p.last_refreshed_at
  from public.properties p
  where auth.uid() is not null
    and p.mobile = lookup_mobile
    and (excluded_property_id is null or p.id <> excluded_property_id)
    and p.status = 'available'
    and p.archived_at is null
  limit 1;
$$;

create or replace function public.refresh_property_timestamp(p_property_id uuid)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_refreshed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_property = true)
  ) then
    raise exception 'You do not have permission to update properties.';
  end if;

  update public.properties
  set last_refreshed_at = now()
  where properties.id = p_property_id
  returning properties.last_refreshed_at into v_refreshed_at;

  if not found then
    raise exception 'Property was not found.';
  end if;

  return v_refreshed_at;
end;
$$;

grant execute on function public.refresh_property_timestamp(uuid) to authenticated;

notify pgrst, 'reload schema';
