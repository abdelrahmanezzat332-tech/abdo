alter table public.customers
  add column if not exists representative_name text;

drop function if exists public.get_customers();
create or replace function public.get_customers()
returns table (
  id uuid, customer_code text, customer_name text, representative_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    c.id, c.customer_code, c.customer_name, c.representative_name,
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
  id uuid, customer_code text, customer_name text, representative_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    c.id, c.customer_code, c.customer_name, c.representative_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city, c.budget, c.notes,
    c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null
    and c.archived_at is not null
  order by c.archived_at desc;
$$;

drop function if exists public.get_customer_by_id(uuid);
create or replace function public.get_customer_by_id(p_customer_id uuid)
returns table (
  id uuid, customer_code text, customer_name text, representative_name text, mobile text,
  city text, budget text, notes text, archived_at timestamptz,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    c.id, c.customer_code, c.customer_name, c.representative_name,
    case when public.can_view_customer_mobile() then c.mobile else '' end as mobile,
    c.city, c.budget, c.notes,
    c.archived_at,
    c.created_by, c.created_at, c.updated_at
  from public.customers c
  where auth.uid() is not null
    and c.id = p_customer_id
  limit 1;
$$;

drop function if exists public.update_customer(uuid, text, text, boolean, text, text, text);
drop function if exists public.update_customer(uuid, text, text, text, boolean, text, text, text);
create or replace function public.update_customer(
  p_customer_id          uuid,
  p_customer_name        text,
  p_representative_name  text,
  p_mobile               text,
  p_keep_existing_mobile boolean,
  p_city                 text,
  p_budget               text,
  p_notes                text
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and (role = 'admin' or can_edit_customer = true)
  ) then raise exception 'You do not have permission to edit customers.'; end if;

  if not p_keep_existing_mobile and (p_mobile is null or btrim(p_mobile) = '') then
    raise exception 'Mobile number is required.';
  end if;

  update public.customers as target
  set
    customer_name       = nullif(btrim(coalesce(p_customer_name, '')), ''),
    representative_name = nullif(btrim(coalesce(p_representative_name, '')), ''),
    mobile              = case when p_keep_existing_mobile then target.mobile else p_mobile end,
    city                = p_city,
    budget              = btrim(p_budget),
    notes               = btrim(p_notes)
  where target.id = p_customer_id;

  if not found then raise exception 'Customer was not found.'; end if;
end;
$$;

notify pgrst, 'reload schema';
