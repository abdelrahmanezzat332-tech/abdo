do $$
declare
  city_constraint record;
begin
  for city_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.properties'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%city%'
  loop
    execute format('alter table public.properties drop constraint if exists %I', city_constraint.conname);
  end loop;
end $$;

update public.properties
set city = 'غير محدد'
where city is null or btrim(city) = '';

alter table public.properties
  alter column city set not null;

alter table public.properties
  add constraint properties_city_not_blank_check
  check (length(btrim(city)) > 0);
