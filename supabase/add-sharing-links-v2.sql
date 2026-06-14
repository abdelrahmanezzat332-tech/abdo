-- ── Create shared_links Table (if not exists) ─────────────────────────────────
create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  property_ids uuid[],
  visible_fields text[] not null default array[]::text[],
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text,
  is_dynamic boolean not null default false,
  dynamic_type text check (dynamic_type in ('main', 'partial', 'all'))
);

-- Alter table if it already exists to add columns and drop constraints safely
alter table public.shared_links add column if not exists name text;
alter table public.shared_links add column if not exists is_dynamic boolean not null default false;
alter table public.shared_links add column if not exists dynamic_type text check (dynamic_type in ('main', 'partial', 'all'));
alter table public.shared_links alter column property_ids drop not null;

-- Enable Row Level Security (RLS)
alter table public.shared_links enable row level security;

-- Policies for shared_links
drop policy if exists "Allow public read access to shared_links" on public.shared_links;
create policy "Allow public read access to shared_links"
on public.shared_links for select to public
using (true);

grant select on public.shared_links to anon, authenticated;

drop policy if exists "Allow authenticated users to create shared_links" on public.shared_links;
create policy "Allow authenticated users to create shared_links"
on public.shared_links for insert to authenticated
with check (auth.uid() = created_by);

grant insert on public.shared_links to authenticated;

drop policy if exists "Allow owners or admins to delete shared_links" on public.shared_links;
create policy "Allow owners or admins to delete shared_links"
on public.shared_links for delete to authenticated
using (auth.uid() = created_by or public.is_admin());

grant delete on public.shared_links to authenticated;

-- ── get_shared_properties RPC Function ────────────────────────────────────────
-- Runs with SECURITY DEFINER to bypass properties table RLS for anonymous requests.
-- Selectively returns fields based on visible_fields configuration in shared_links.
-- Handles both static list of properties and dynamic categories (main/partial/all).
drop function if exists public.get_shared_properties(uuid);
create or replace function public.get_shared_properties(p_share_id uuid)
returns table (
  id uuid,
  property_code text,
  operation public.operation_type,
  city text,
  property_type text,
  employee_name text,
  mobile text,
  description text,
  price text,
  status public.property_status,
  is_partial boolean,
  availability_type text,
  availability_other text,
  created_at timestamptz,
  visible_fields text[]
)
language plpgsql security definer set search_path = public
as $$
declare
  v_property_ids uuid[];
  v_visible_fields text[];
  v_is_dynamic boolean;
  v_dynamic_type text;
begin
  -- Retrieve the shared link configuration
  select sl.property_ids, sl.visible_fields, sl.is_dynamic, sl.dynamic_type
  into v_property_ids, v_visible_fields, v_is_dynamic, v_dynamic_type
  from public.shared_links as sl
  where sl.id = p_share_id;

  if not found then
    return;
  end if;

  v_visible_fields := coalesce(v_visible_fields, array[]::text[]);

  -- Return properties based on static list or dynamic configuration
  return query
  select
    p.id,
    case when 'property_code' = any(v_visible_fields) then p.property_code::text else null::text end,
    p.operation::public.operation_type, -- always visible to show rent vs sell
    case when 'city' = any(v_visible_fields) then p.city::text else null::text end,
    case when 'property_type' = any(v_visible_fields) then p.property_type::text else null::text end,
    case when 'employee_name' = any(v_visible_fields) then p.employee_name::text else null::text end,
    case when 'mobile' = any(v_visible_fields) then p.mobile::text else null::text end,
    case when 'description' = any(v_visible_fields) then p.description::text else null::text end,
    case when 'price' = any(v_visible_fields) then p.price::text else null::text end,
    case when 'status' = any(v_visible_fields) then p.status::public.property_status else null::public.property_status end,
    p.is_partial,
    case when 'availability_type' = any(v_visible_fields) then p.availability_type::text else null::text end,
    case when 'availability_type' = any(v_visible_fields) then p.availability_other::text else ''::text end,
    p.created_at,
    v_visible_fields
  from public.properties p
  where p.archived_at is null
    and p.status::text = 'available'
    and (
      (not coalesce(v_is_dynamic, false) and p.id = any(v_property_ids))
      or
      (coalesce(v_is_dynamic, false) and (
        v_dynamic_type = 'all'
        or (v_dynamic_type = 'main' and not p.is_partial)
        or (v_dynamic_type = 'partial' and p.is_partial)
      ))
    )
  order by p.created_at desc;
end;
$$;

-- Grant execution permission to anonymous and authenticated users
grant execute on function public.get_shared_properties(uuid) to anon, authenticated;
