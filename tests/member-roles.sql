-- 임시 로컬 DB 전용. 운영 DB에서 실행하지 않는다.
\set ON_ERROR_STOP on
create type profile_role_fixture as enum ('member', 'full_member', 'staff', 'admin');
create table public.profiles (id int primary key, role profile_role_fixture not null, status text, is_banned boolean);
insert into profiles values (1,'member','approved',false),(2,'full_member','approved',true),(3,'staff','approved',false),(4,'admin','approved',false),(5,'full_member','pending',false);
create table posts_fixture (id int primary key, created_by int references profiles(id));
insert into posts_fixture values (1,2);
\ir ../supabase/migrations/20261002000002_unify_member_roles.sql
\ir ../supabase/migrations/20261002000002_unify_member_roles.sql
do $$
begin
  if (select count(*) from profiles where role = 'member') <> 3 then raise exception 'member merge failed'; end if;
  if not exists (select 1 from profiles where id=2 and is_banned and status='approved') then raise exception 'banned/status changed'; end if;
  if not exists (select 1 from profiles where id=5 and status='pending') then raise exception 'pending status changed'; end if;
  if not exists (select 1 from profiles where id=3 and role='staff') or not exists (select 1 from profiles where id=4 and role='admin') then raise exception 'staff/admin changed'; end if;
  if not exists (select 1 from posts_fixture where created_by=2) then raise exception 'post ownership changed'; end if;
  begin
    update profiles set role='full_member' where id=1;
    raise exception 'legacy role accepted';
  exception when check_violation then null;
  end;
end $$;
select 'member roles, preserved status/ownership, idempotency and legacy-role rejection passed' as result;
