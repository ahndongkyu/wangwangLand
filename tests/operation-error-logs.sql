-- 신규 마이그레이션을 적용한 격리 테스트 DB 전용. 모든 테스트 데이터는 롤백한다.
begin;
set local role service_role;
select public.record_operation_error('application','testFailure','23505','application');
select public.record_operation_error('application','testFailure','23505','application');
do $$ begin
  if not exists (select 1 from public.operation_error_logs where step = 'testFailure' and occurrences = 2 and status = 'open') then raise exception 'aggregation failed'; end if;
end $$;

update public.operation_error_logs set status = 'resolved', status_changed_at = now() where step = 'testFailure';
select public.record_operation_error('application','testFailure','23505','application');
do $$ begin
  if not exists (select 1 from public.operation_error_logs where step = 'testFailure' and occurrences = 3 and status = 'open' and recurrences = 1) then raise exception 'reopen failed'; end if;
end $$;
update public.operation_error_logs set status = 'investigating' where step = 'testFailure';
select public.record_operation_error('application','testFailure','23505','application');
do $$ begin
  if not exists (select 1 from public.operation_error_logs where step = 'testFailure' and occurrences = 4 and status = 'investigating' and recurrences = 1) then raise exception 'investigating state lost'; end if;
end $$;

select public.record_operation_error('browser','boundary','UNKNOWN','public');
select public.record_operation_error('browser','boundary','UNKNOWN','public');
do $$ begin
  if not exists (select 1 from public.operation_error_logs where operation = 'browser' and occurrences = 1) then raise exception 'browser throttle failed'; end if;
end $$;
update public.operation_error_logs set last_seen_at = now() - interval '2 minutes' where operation = 'browser';
select public.record_operation_error('browser','boundary','UNKNOWN','public');
do $$ begin
  if not exists (select 1 from public.operation_error_logs where operation = 'browser' and occurrences = 2) then raise exception 'browser resume failed'; end if;
end $$;

-- 오래된 화면에서 해결 처리하면 새 오류를 덮어쓰지 않아야 한다.
do $$ declare old_seen timestamptz; affected integer; begin
  select last_seen_at into old_seen from public.operation_error_logs where step = 'testFailure';
  perform public.record_operation_error('application','testFailure','23505','application');
  update public.operation_error_logs set status = 'resolved' where step = 'testFailure' and last_seen_at = old_seen;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'stale state update accepted'; end if;
end $$;

reset role;
do $$ begin
  if has_table_privilege('anon', 'public.operation_error_logs', 'SELECT') or has_table_privilege('authenticated', 'public.operation_error_logs', 'SELECT') then raise exception 'log read leak'; end if;
  if has_table_privilege('authenticated', 'public.operation_error_logs', 'UPDATE') then raise exception 'log write leak'; end if;
  if has_function_privilege('anon','public.record_operation_error(text,text,text,text)','EXECUTE') or has_function_privilege('authenticated','public.record_operation_error(text,text,text,text)','EXECUTE') then raise exception 'RPC permission leak'; end if;
end $$;
set local role service_role;
insert into public.operation_error_logs(operation,step,code,area,last_seen_at) values ('server','expiredTest','UNKNOWN','admin',now() - interval '91 days');
delete from public.operation_error_logs where last_seen_at < now() - interval '90 days';
do $$ begin
  if exists (select 1 from public.operation_error_logs where step = 'expiredTest') or not exists (select 1 from public.operation_error_logs where step = 'testFailure') then raise exception 'retention scope failed'; end if;
end $$;
rollback;
