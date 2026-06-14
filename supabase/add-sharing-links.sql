-- ── shared_links Table ────────────────────────────────────────────────────────
create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  property_ids uuid[] not null,
  visible_fields text[] not null default array[]::text[],
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.shared_links enable row level security;

-- Policies for shared_links
drop policy if exists "Allow public read access to shared_links" on public.shared_links;
create policy "Allow public read access to shared_links"
on public.shared_links for select to public
using (true);

drop policy if exists "Allow authenticated users to create shared_links" on public.shared_links;
create policy "Allow authenticated users to create shared_links"
on public.shared_links for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Allow owners or admins to delete shared_links" on public.shared_links;
create policy "Allow owners or admins to delete shared_links"
on public.shared_links for delete to authenticated
using (auth.uid() = created_by or public.is_admin());

-- ── get_shared_properties RPC Function ────────────────────────────────────────
-- Runs with SECURITY DEFINER to bypass properties table RLS for anonymous requests.
-- Selectively returns fields based on visible_fields configuration in shared_links.
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
begin
  -- Retrieve the shared link configuration
  select property_ids, visible_fields
  into v_property_ids, v_visible_fields
  from public.shared_links
  where id = p_share_id;

  if not found then
    return;
  end if;

  -- Return the properties filtering non-archived matching IDs, projecting only allowed columns
  return query
  select
    p.id,
    case when 'property_code' = any(v_visible_fields) then p.property_code else null end,
    p.operation, -- always visible to show rent vs sell
    case when 'city' = any(v_visible_fields) then p.city else null end,
    case when 'property_type' = any(v_visible_fields) then p.property_type else null end,
    case when 'employee_name' = any(v_visible_fields) then p.employee_name else null end,
    case when 'mobile' = any(v_visible_fields) then p.mobile else null end,
    case when 'description' = any(v_visible_fields) then p.description else null end,
    case when 'price' = any(v_visible_fields) then p.price else null end,
    case when 'status' = any(v_visible_fields) then p.status else null end,
    p.is_partial,
    case when 'availability_type' = any(v_visible_fields) then p.availability_type else null end,
    case when 'availability_type' = any(v_visible_fields) then p.availability_other else '' end,
    p.created_at,
    v_visible_fields
  from public.properties p
  where p.id = any(v_property_ids)
    and p.archived_at is null;
end;
$$;

-- Grant execution permission to anonymous and authenticated users
grant execute on function public.get_shared_properties(uuid) to anon, authenticated;
