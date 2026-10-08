begin;

create table public.operation_error_logs (
  id uuid primary key default gen_random_uuid(),
  operation text not null check (operation in ('application','calendar','post','upload','push','sms','query','server','browser')),
  step text not null check (step ~ '^[a-zA-Z][a-zA-Z0-9_. -]{0,79}$'),
  code text not null check (length(code) between 1 and 24),
  area text not null check (area in ('public','admin','application','calendar','post','upload','notification')),
  status text not null default 'open' check (status in ('open','investigating','resolved')),
  occurrences integer not null default 1,
  recurrences integer not null default 0,
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  status_changed_at timestamptz,
  unique (operation, step, code, area)
);
create index operation_error_logs_recent_idx on public.operation_error_logs(last_seen_at desc, id desc);
alter table public.operation_error_logs enable row level security;
revoke all on public.operation_error_logs from anon, authenticated;
grant all on public.operation_error_logs to service_role;

create function public.record_operation_error(p_operation text, p_step text, p_code text, p_area text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.operation_error_logs as logs (operation, step, code, area)
  values (p_operation, p_step, p_code, p_area)
  on conflict (operation, step, code, area) do update set
    occurrences = least(logs.occurrences::bigint + 1, 2147483647)::integer,
    recurrences = logs.recurrences + case when logs.status = 'resolved' then 1 else 0 end,
    status = case when logs.status = 'resolved' then 'open' else logs.status end,
    last_seen_at = clock_timestamp()
  -- 브라우저 신고는 같은 종류·영역당 1분에 한 번만 집계한다.
  where p_operation <> 'browser' or logs.last_seen_at < clock_timestamp() - interval '1 minute';
end;
$$;
revoke all on function public.record_operation_error(text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_operation_error(text,text,text,text) to service_role;

commit;
