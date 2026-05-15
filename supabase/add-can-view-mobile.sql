alter table public.users
add column if not exists can_view_mobile boolean not null default false;

update public.users
set can_view_mobile = true
where lower(email) = 'abdelrahmanezzat332@gmail.com'
   or role = 'admin';
