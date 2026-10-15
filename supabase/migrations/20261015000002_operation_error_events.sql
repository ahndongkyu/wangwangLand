begin;

create table if not exists public.operation_error_events (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.operation_error_logs(id) on delete cascade,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'unknown' check (actor_role in ('admin','staff','member','anonymous','unknown')),
  page text not null check (length(page) <= 160),
  target_type text check (target_type in ('volunteer','adoption','event','notice','expense','daily','story','document')),
  target_id uuid,
  action text check (action in ('approve','reject','complete','cancel','upload','download','create','update','delete')),
  description text not null check (length(description) <= 300),
  location text check (length(location) <= 600),
  browser text not null check (browser in ('Chrome','Safari','Firefox','Edge','unknown')),
  device text not null check (device in ('mobile','tablet','desktop','unknown')),
  release text check (release ~ '^[0-9a-fA-F]{40}$'),
  trace_id uuid not null unique,
  source text not null check (source in ('server','browser'))
);
create index if not exists operation_error_events_log_time_idx on public.operation_error_events(log_id, occurred_at desc, id desc);
create index if not exists operation_error_events_time_idx on public.operation_error_events(occurred_at);
create index if not exists operation_error_events_browser_actor_idx on public.operation_error_events(actor_id, occurred_at desc) where source='browser';
alter table public.operation_error_events enable row level security;
revoke all on public.operation_error_events from public, anon, authenticated;
grant all on public.operation_error_events to service_role;

create or replace function public.record_operation_error_event(p_operation text,p_step text,p_code text,p_area text,p_context jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_log uuid;
  v_actor uuid;
  v_role text := case when p_context->>'actor_state' = 'anonymous' then 'anonymous' else 'unknown' end;
  v_page text := coalesce(p_context->>'page','unknown');
begin
  if p_context->>'actor_id' is not null then
    select id, case when role in ('admin','staff') then role else 'member' end into v_actor,v_role
      from public.profiles where id = (p_context->>'actor_id')::uuid;
    if v_actor is null then v_role := 'unknown'; end if;
  end if;
  -- 같은 회원·페이지의 브라우저 오류만 제한한다. 다른 회원의 발생 기록은 보존한다.
  if p_operation = 'browser' then
    perform pg_advisory_xact_lock(hashtextextended('browser:' || coalesce(v_actor::text,'anonymous'),0));
    -- 오류 전송 API 악용·무한 루프에 의한 적재 폭증 방지. 비로그인은 한 그룹으로 제한한다.
    if (select count(*) from public.operation_error_events where source='browser' and actor_id is not distinct from v_actor and occurred_at>clock_timestamp()-interval '1 minute') >= 20 then return; end if;
    if exists (
      select 1 from public.operation_error_events e join public.operation_error_logs l on l.id=e.log_id
      where l.operation=p_operation and l.step=p_step and l.code=p_code and l.area=p_area
        and e.actor_id is not distinct from v_actor and e.page=v_page
        and e.occurred_at > clock_timestamp()-interval '1 minute'
    ) then return; end if;
  end if;
  insert into public.operation_error_logs as l(operation,step,code,area)
    values(p_operation,p_step,p_code,p_area)
    on conflict(operation,step,code,area) do update set
      occurrences=least(l.occurrences::bigint+1,2147483647)::integer,
      recurrences=l.recurrences+case when l.status='resolved' then 1 else 0 end,
      status=case when l.status='resolved' then 'open' else l.status end,
      last_seen_at=clock_timestamp()
    returning id into v_log;
  insert into public.operation_error_events(log_id,actor_id,actor_role,page,target_type,target_id,action,description,location,browser,device,release,trace_id,source)
    values(v_log,v_actor,coalesce(v_role,'unknown'),v_page,p_context->>'target_type',(p_context->>'target_id')::uuid,
      p_context->>'action',p_context->>'description',p_context->>'location',coalesce(p_context->>'browser','unknown'),
      coalesce(p_context->>'device','unknown'),p_context->>'release',(p_context->>'trace_id')::uuid,
      case when p_operation='browser' then 'browser' else 'server' end);
end;
$$;
revoke all on function public.record_operation_error_event(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_operation_error_event(text,text,text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
