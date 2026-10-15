-- 격리된 테스트 DB에서만 실행한다. 테스트 데이터는 모두 롤백한다.
begin;
insert into public.profiles(id,role) values ('00000000-0000-4000-8000-000000000001','admin'),('00000000-0000-4000-8000-000000000002','member');
set local role service_role;
select public.record_operation_error_event('application','processAdoption','23514','application',
 '{"actor_id":"00000000-0000-4000-8000-000000000001","page":"/admin/applications/adoption/[detail]","target_type":"adoption","target_id":"00000000-0000-4000-8000-000000000003","action":"approve","description":"DB constraint","browser":"Safari","device":"mobile","trace_id":"00000000-0000-4000-8000-000000000004"}');
do $$ begin
 if not exists(select 1 from public.operation_error_events where actor_role='admin' and action='approve' and target_type='adoption') then raise exception 'context missing'; end if;
end $$;
update public.operation_error_logs set status='resolved' where step='processAdoption';
select public.record_operation_error_event('application','processAdoption','23514','application',
 '{"page":"/adoption","description":"DB constraint","browser":"unknown","device":"unknown","trace_id":"00000000-0000-4000-8000-000000000005"}');
do $$ begin
 if not exists(select 1 from public.operation_error_logs where step='processAdoption' and occurrences=2 and recurrences=1 and status='open') then raise exception 'summary lost'; end if;
 if (select count(*) from public.operation_error_events)<>2 then raise exception 'individual events lost'; end if;
end $$;
select public.record_operation_error_event('browser','unhandled.adoption','TypeError','application',
 '{"actor_id":"00000000-0000-4000-8000-000000000001","page":"/adoption","description":"Browser","browser":"Safari","device":"mobile","trace_id":"00000000-0000-4000-8000-000000000006"}');
select public.record_operation_error_event('browser','unhandled.adoption','TypeError','application',
 '{"actor_id":"00000000-0000-4000-8000-000000000001","page":"/adoption","description":"Browser","browser":"Safari","device":"mobile","trace_id":"00000000-0000-4000-8000-000000000007"}');
select public.record_operation_error_event('browser','unhandled.adoption','TypeError','application',
 '{"actor_id":"00000000-0000-4000-8000-000000000002","page":"/adoption","description":"Browser","browser":"Safari","device":"mobile","trace_id":"00000000-0000-4000-8000-000000000008"}');
do $$ begin
 if (select count(*) from public.operation_error_events where source='browser')<>2 then raise exception 'per-user throttle wrong'; end if;
 if not exists(select 1 from public.operation_error_logs where operation='browser' and occurrences=2) then raise exception 'summary throttle wrong'; end if;
end $$;
-- 유효하지 않은 상세정보 저장 실패는 집계도 함께 롤백한다.
savepoint browser_burst;
do $$ begin
 for i in 1..30 loop
  perform public.record_operation_error_event('browser','burst'||i,'UNKNOWN','public',jsonb_build_object('actor_id','00000000-0000-4000-8000-000000000002','page','/','description','Browser','browser','unknown','device','unknown','trace_id',gen_random_uuid()));
 end loop;
 if (select count(*) from public.operation_error_events where actor_id='00000000-0000-4000-8000-000000000002')<>20 then raise exception 'browser burst limit failed'; end if;
end $$;
rollback to savepoint browser_burst;
do $$ declare n integer; begin
 select sum(occurrences) into n from public.operation_error_logs;
 begin
  perform public.record_operation_error_event('application','processAdoption','23514','application','{"page":"/adoption","description":"Bad","browser":"forged","device":"unknown","trace_id":"00000000-0000-4000-8000-000000000009"}');
  raise exception 'invalid metadata accepted';
 exception when check_violation then null;
 end;
 if (select sum(occurrences) from public.operation_error_logs)<>n then raise exception 'partial aggregation'; end if;
end $$;
-- 요약이 최근에도 재발하더라도 90일이 지난 개별 기록은 정리한다.
update public.operation_error_events set occurred_at=now()-interval '91 days' where trace_id='00000000-0000-4000-8000-000000000004';
delete from public.operation_error_events where occurred_at<now()-interval '90 days';
do $$ begin
 if (select count(*) from public.operation_error_events)<>3 then raise exception 'retention wrong'; end if;
end $$;
reset role;
delete from public.profiles where id='00000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.operation_error_events where actor_id='00000000-0000-4000-8000-000000000001') then raise exception 'deleted member retained'; end if;
 if has_table_privilege('anon','public.operation_error_events','SELECT') or has_table_privilege('authenticated','public.operation_error_events','SELECT') then raise exception 'event access leak'; end if;
 if has_function_privilege('authenticated','public.record_operation_error_event(text,text,text,text,jsonb)','EXECUTE') then raise exception 'event write leak'; end if;
end $$;
rollback;
