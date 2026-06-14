do $$
begin
  if exists (
    select 1
    from pg_enum
    where enumtypid = 'public.operation_type'::regtype
      and enumlabel = 'buy'
  ) and not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.operation_type'::regtype
      and enumlabel = 'rent'
  ) then
    alter type public.operation_type rename value 'buy' to 'rent';
  end if;
end $$;

insert into public.users (
  full_name,
  email,
  role,
  can_add_employee,
  can_edit_permissions,
  can_delete_employee,
  can_add_property,
  can_edit_property,
  can_delete_property,
  can_view_mobile,
  can_view_all
)
values (
  'Abdelrahman',
  'abdelrahmanezzat332@gmail.com',
  'admin',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
)
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = 'admin',
  can_add_employee = true,
  can_edit_permissions = true,
  can_delete_employee = true,
  can_add_property = true,
  can_edit_property = true,
  can_delete_property = true,
  can_view_mobile = true,
  can_view_all = true;
