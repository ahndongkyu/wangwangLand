-- 임시 로컬 DB 전용 테스트. 운영 DB에서 실행하지 않는다.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create table public.volunteer_applications (id uuid primary key);
create table public.adoption_applications (id uuid primary key);
create table public.events (id int primary key, source_application_type text, source_application_id uuid);
create table public.daily_posts (id int primary key, related_volunteer_application_id uuid references public.volunteer_applications(id) on delete set null);
\ir ../supabase/migrations/20261002000001_atomic_application_delete.sql

insert into volunteer_applications values ('00000000-0000-0000-0000-000000000001');
insert into adoption_applications values ('00000000-0000-0000-0000-000000000002');
insert into events values (1, 'volunteer', '00000000-0000-0000-0000-000000000001'), (2, 'adoption', '00000000-0000-0000-0000-000000000002');
insert into daily_posts values (1, '00000000-0000-0000-0000-000000000001');

-- 실패 주입: 신청 삭제에 실패하면 앞서 삭제된 일정도 복원되어야 한다.
create function fail_delete() returns trigger language plpgsql as $$ begin raise exception 'injected deletion failure'; end $$;
create trigger fail_volunteer_delete before delete on volunteer_applications for each row execute function fail_delete();
do $$
begin
  begin
    perform delete_application_with_events('00000000-0000-0000-0000-000000000001', 'volunteer');
    raise exception 'expected injected failure';
  exception when others then
    if sqlerrm <> 'injected deletion failure' then raise; end if;
  end;
  if not exists (select 1 from events where id=1) or not exists (select 1 from volunteer_applications) then
    raise exception 'partial deletion after rollback';
  end if;
  if has_function_privilege('anon', 'delete_application_with_events(uuid,text)', 'execute')
     or has_function_privilege('authenticated', 'delete_application_with_events(uuid,text)', 'execute') then
    raise exception 'public role has deletion privilege';
  end if;
end $$;
drop trigger fail_volunteer_delete on volunteer_applications;

set role service_role;
select delete_application_with_events('00000000-0000-0000-0000-000000000001', 'volunteer');
select delete_application_with_events('00000000-0000-0000-0000-000000000002', 'adoption');
reset role;
do $$
begin
  if exists (select 1 from events) or exists (select 1 from volunteer_applications) or exists (select 1 from adoption_applications) then
    raise exception 'application or schedule was not deleted';
  end if;
  if not exists (select 1 from daily_posts where id=1 and related_volunteer_application_id is null) then
    raise exception 'historical post was not preserved';
  end if;
  begin
    perform delete_application_with_events('00000000-0000-0000-0000-000000000001', 'unsupported');
    raise exception 'invalid type accepted';
  exception when others then
    if sqlerrm = 'invalid type accepted' then raise; end if;
  end;
end $$;
select 'atomic deletion, rollback, permissions and historical post preservation passed' as result;
