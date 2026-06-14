-- Run this migration once on an existing database before deploying the UI.

alter table public.properties
  add column if not exists is_partial boolean not null default false;

alter table public.properties
  add column if not exists availability_type text;

alter table public.properties
  add column if not exists availability_other text not null default '';

alter table public.properties
  drop constraint if exists properties_partial_availability_check;

alter table public.properties
  add constraint properties_partial_availability_check
  check (
    (not is_partial and availability_type is null and availability_other = '')
    or (
      is_partial
      and availability_type in ('bed', 'room', 'other')
      and (
        availability_type <> 'other'
        or length(btrim(availability_other)) > 0
      )
    )
  );

create index if not exists properties_is_partial_idx
  on public.properties(is_partial);

drop function if exists public.get_properties();
create or replace function public.get_properties()
returns table (
  id uuid, property_code text, operation public.operation_type,
  city text, property_type text, employee_name text, mobile text,
  description text, price text,
  status public.property_status, is_partial boolean,
  availability_type text, availability_other text,
  archived_at timestamptz, related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
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
  status public.property_status, is_partial boolean,
  availability_type text, availability_other text,
  archived_at timestamptz, related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
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
  status public.property_status, is_partial boolean,
  availability_type text, availability_other text,
  archived_at timestamptz, related_property_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
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
    p.created_at, p.updated_at
  from public.properties p
  where auth.uid() is not null
    and p.mobile = lookup_mobile
    and (excluded_property_id is null or p.id <> excluded_property_id)
    and p.status = 'available'
    and p.archived_at is null
  limit 1;
$$;

drop function if exists public.create_partial_property(
  public.operation_type, text, text, text, text, text, text,
  public.property_status, uuid, text, text
);
create or replace function public.create_partial_property(
  p_operation public.operation_type,
  p_city text,
  p_property_type text,
  p_employee_name text,
  p_mobile text,
  p_description text,
  p_price text,
  p_status public.property_status default 'available',
  p_related_property_id uuid default null,
  p_availability_type text default 'bed',
  p_availability_other text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_property_id uuid;
begin
  if p_availability_type not in ('bed', 'room', 'other') then
    raise exception 'Invalid partial availability type.';
  end if;

  if p_availability_type = 'other'
    and btrim(coalesce(p_availability_other, '')) = '' then
    raise exception 'The custom availability type is required.';
  end if;

  v_property_id := public.create_property(
    p_operation, p_city, p_property_type, p_employee_name, p_mobile,
    p_description, p_price, p_status, p_related_property_id
  );

  update public.properties
  set is_partial = true,
      availability_type = p_availability_type,
      availability_other = case
        when p_availability_type = 'other' then btrim(p_availability_other)
        else ''
      end
  where id = v_property_id;

  return v_property_id;
end;
$$;

drop function if exists public.update_partial_property(
  uuid, public.operation_type, text, text, text, text, boolean,
  text, text, public.property_status, uuid, text, text
);
create or replace function public.update_partial_property(
  p_property_id uuid,
  p_operation public.operation_type,
  p_city text,
  p_property_type text,
  p_employee_name text,
  p_mobile text,
  p_keep_existing_mobile boolean,
  p_description text,
  p_price text,
  p_status public.property_status,
  p_related_property_id uuid default null,
  p_availability_type text default 'bed',
  p_availability_other text default ''
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.properties
    where id = p_property_id and is_partial = true
  ) then
    raise exception 'Partial property was not found.';
  end if;

  if p_availability_type not in ('bed', 'room', 'other') then
    raise exception 'Invalid partial availability type.';
  end if;

  if p_availability_type = 'other'
    and btrim(coalesce(p_availability_other, '')) = '' then
    raise exception 'The custom availability type is required.';
  end if;

  perform public.update_property(
    p_property_id, p_operation, p_city, p_property_type, p_employee_name,
    p_mobile, p_keep_existing_mobile, p_description, p_price, p_status,
    p_related_property_id
  );

  update public.properties
  set availability_type = p_availability_type,
      availability_other = case
        when p_availability_type = 'other' then btrim(p_availability_other)
        else ''
      end
  where id = p_property_id;
end;
$$;

grant execute on function public.create_partial_property(
  public.operation_type, text, text, text, text, text, text,
  public.property_status, uuid, text, text
) to authenticated;

grant execute on function public.update_partial_property(
  uuid, public.operation_type, text, text, text, text, boolean,
  text, text, public.property_status, uuid, text, text
) to authenticated;

notify pgrst, 'reload schema';
