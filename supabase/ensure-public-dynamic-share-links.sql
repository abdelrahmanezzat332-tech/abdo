-- Run this in Supabase SQL Editor to make /share/:id links public on Vercel.
-- It keeps admin-created links private to manage, but readable/executable by anonymous visitors.

alter table public.shared_links add column if not exists name text;
alter table public.shared_links add column if not exists is_dynamic boolean not null default false;
alter table public.shared_links add column if not exists dynamic_type text check (dynamic_type in ('main', 'partial', 'all'));
alter table public.shared_links alter column property_ids drop not null;

alter table public.shared_links enable row level security;

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

grant usage on schema public to anon, authenticated;
grant select on public.shared_links to anon, authenticated;
grant insert, delete on public.shared_links to authenticated;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_ids uuid[];
  v_visible_fields text[];
  v_is_dynamic boolean;
  v_dynamic_type text;
begin
  select property_ids, visible_fields, is_dynamic, dynamic_type
  into v_property_ids, v_visible_fields, v_is_dynamic, v_dynamic_type
  from public.shared_links
  where id = p_share_id;

  if not found then
    return;
  end if;

  return query
  select
    p.id,
    case when 'property_code' = any(v_visible_fields) then p.property_code else null end,
    p.operation,
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
  where p.archived_at is null
    and p.status = 'available'::public.property_status
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

revoke all on function public.get_shared_properties(uuid) from public;
grant execute on function public.get_shared_properties(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
