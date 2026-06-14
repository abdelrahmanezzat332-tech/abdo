-- Admin-only JSON backup export/import.

drop function if exists public.export_app_backup();
create or replace function public.export_app_backup()
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can export backups.';
  end if;

  return jsonb_build_object('version', 1,
    'exported_at', now(),
    'data', jsonb_build_object(
      'users', coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at) from public.users u), '[]'::jsonb),
      'properties', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.properties p), '[]'::jsonb),
      'customers', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.customers c), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.export_app_backup() from public, anon;
grant execute on function public.export_app_backup() to authenticated;

drop function if exists public.import_app_backup(jsonb);
create or replace function public.import_app_backup(p_backup jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  users_count int := jsonb_array_length(coalesce(p_backup #> '{data,users}', '[]'::jsonb));
  properties_count int := jsonb_array_length(coalesce(p_backup #> '{data,properties}', '[]'::jsonb));
  customers_count int := jsonb_array_length(coalesce(p_backup #> '{data,customers}', '[]'::jsonb));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can import backups.';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' or not (p_backup ? 'data') then
    raise exception 'Invalid backup file.';
  end if;

  if coalesce(p_backup->>'version', '1') <> '1' then
    raise exception 'Unsupported backup version.';
  end if;

  insert into public.users (
    id, auth_id, full_name, email, role,
    can_add_employee, can_edit_permissions, can_delete_employee,
    can_add_property, can_edit_property, can_delete_property,
    can_add_customer, can_edit_customer, can_delete_customer,
    can_view_mobile, can_view_customer_mobile, can_view_all,
    created_at, updated_at
  )
  select
    i.id,
    case
      when i.auth_id is not null and exists (select 1 from auth.users au where au.id = i.auth_id) then i.auth_id
      else null
    end,
    btrim(i.full_name),
    lower(btrim(i.email)),
    coalesce(i.role, 'employee'::public.user_role),
    coalesce(i.can_add_employee, false),
    coalesce(i.can_edit_permissions, false),
    coalesce(i.can_delete_employee, false),
    coalesce(i.can_add_property, true),
    coalesce(i.can_edit_property, false),
    coalesce(i.can_delete_property, false),
    coalesce(i.can_add_customer, true),
    coalesce(i.can_edit_customer, false),
    coalesce(i.can_delete_customer, false),
    coalesce(i.can_view_mobile, false),
    coalesce(i.can_view_customer_mobile, false),
    coalesce(i.can_view_all, false),
    coalesce(i.created_at, now()),
    coalesce(i.updated_at, now())
  from jsonb_to_recordset(coalesce(p_backup #> '{data,users}', '[]'::jsonb)) as i(
    id uuid, auth_id uuid, full_name text, email text, role public.user_role,
    can_add_employee boolean, can_edit_permissions boolean, can_delete_employee boolean,
    can_add_property boolean, can_edit_property boolean, can_delete_property boolean,
    can_add_customer boolean, can_edit_customer boolean, can_delete_customer boolean,
    can_view_mobile boolean, can_view_customer_mobile boolean, can_view_all boolean,
    created_at timestamptz, updated_at timestamptz
  )
  where i.id is not null and nullif(btrim(i.email), '') is not null and nullif(btrim(i.full_name), '') is not null
  on conflict (id) do update
  set
    auth_id = excluded.auth_id,
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    can_add_employee = excluded.can_add_employee,
    can_edit_permissions = excluded.can_edit_permissions,
    can_delete_employee = excluded.can_delete_employee,
    can_add_property = excluded.can_add_property,
    can_edit_property = excluded.can_edit_property,
    can_delete_property = excluded.can_delete_property,
    can_add_customer = excluded.can_add_customer,
    can_edit_customer = excluded.can_edit_customer,
    can_delete_customer = excluded.can_delete_customer,
    can_view_mobile = excluded.can_view_mobile,
    can_view_customer_mobile = excluded.can_view_customer_mobile,
    can_view_all = excluded.can_view_all,
    updated_at = excluded.updated_at;

  insert into public.properties (
    id, operation, city, property_type, employee_name, mobile, description, price,
    property_code, status, is_partial, availability_type, availability_other,
    archived_at, related_property_id, created_by, created_at, updated_at
  )
  select
    i.id, i.operation, btrim(i.city), i.property_type, btrim(i.employee_name), i.mobile,
    btrim(i.description), coalesce(i.price, ''), i.property_code,
    coalesce(i.status, 'available'::public.property_status),
    coalesce(i.is_partial, false), i.availability_type, coalesce(i.availability_other, ''),
    i.archived_at, null,
    case
      when i.created_by is not null and exists (select 1 from auth.users au where au.id = i.created_by) then i.created_by
      else null
    end,
    coalesce(i.created_at, now()),
    coalesce(i.updated_at, now())
  from jsonb_to_recordset(coalesce(p_backup #> '{data,properties}', '[]'::jsonb)) as i(
    id uuid, property_code text, operation public.operation_type, city text, property_type text,
    employee_name text, mobile text, description text, price text, status public.property_status,
    is_partial boolean, availability_type text, availability_other text, archived_at timestamptz,
    related_property_id uuid, created_by uuid, created_at timestamptz, updated_at timestamptz
  )
  where i.id is not null
  on conflict (id) do update
  set
    operation = excluded.operation,
    city = excluded.city,
    property_type = excluded.property_type,
    employee_name = excluded.employee_name,
    mobile = excluded.mobile,
    description = excluded.description,
    price = excluded.price,
    property_code = excluded.property_code,
    status = excluded.status,
    is_partial = excluded.is_partial,
    availability_type = excluded.availability_type,
    availability_other = excluded.availability_other,
    archived_at = excluded.archived_at,
    created_by = excluded.created_by,
    updated_at = excluded.updated_at;

  with incoming as (
    select id, related_property_id
    from jsonb_to_recordset(coalesce(p_backup #> '{data,properties}', '[]'::jsonb)) as i(
      id uuid, related_property_id uuid
    )
  )
  update public.properties as target
  set related_property_id = case
    when incoming.related_property_id is not null
      and exists (select 1 from public.properties related where related.id = incoming.related_property_id)
    then incoming.related_property_id
    else null
  end
  from incoming
  where target.id = incoming.id;

  insert into public.customers (
    id, customer_code, customer_name, representative_name, mobile, city, budget, notes,
    archived_at, created_by, created_at, updated_at
  )
  select
    i.id, i.customer_code, nullif(btrim(coalesce(i.customer_name, '')), ''),
    nullif(btrim(coalesce(i.representative_name, '')), ''), i.mobile, i.city,
    btrim(i.budget), btrim(i.notes), i.archived_at,
    case
      when i.created_by is not null and exists (select 1 from auth.users au where au.id = i.created_by) then i.created_by
      else null
    end,
    coalesce(i.created_at, now()),
    coalesce(i.updated_at, now())
  from jsonb_to_recordset(coalesce(p_backup #> '{data,customers}', '[]'::jsonb)) as i(
    id uuid, customer_code text, customer_name text, representative_name text, mobile text,
    city text, budget text, notes text, archived_at timestamptz, created_by uuid,
    created_at timestamptz, updated_at timestamptz
  )
  where i.id is not null
  on conflict (id) do update
  set
    customer_code = excluded.customer_code,
    customer_name = excluded.customer_name,
    representative_name = excluded.representative_name,
    mobile = excluded.mobile,
    city = excluded.city,
    budget = excluded.budget,
    notes = excluded.notes,
    archived_at = excluded.archived_at,
    created_by = excluded.created_by,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'users', users_count,
    'properties', properties_count,
    'customers', customers_count
  );
end;
$$;

revoke execute on function public.import_app_backup(jsonb) from public, anon;
grant execute on function public.import_app_backup(jsonb) to authenticated;
