alter table public.properties add column if not exists archived_at timestamptz;
alter table public.customers add column if not exists archived_at timestamptz;
alter table public.customers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();

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

drop function if exists public.archive_property(uuid);
create or replace function public.archive_property(p_property_id uuid)
returns void language plpgsql security definer set search_path = public
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
    raise exception 'You do not have permission to archive properties.';
  end if;

  update public.properties
  set archived_at = now()
  where id = p_property_id and archived_at is null;

  if not found then
    raise exception 'Property not found or already archived.';
  end if;
end;
$$;

drop function if exists public.unarchive_property(uuid);
create or replace function public.unarchive_property(p_property_id uuid)
returns void language plpgsql security definer set search_path = public
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
    raise exception 'You do not have permission to unarchive properties.';
  end if;

  update public.properties
  set status = 'available',
      archived_at = null
  where id = p_property_id
    and (archived_at is not null or status in ('sold', 'rented'));

  if not found then
    raise exception 'Property not found or not archived.';
  end if;
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

notify pgrst, 'reload schema';
