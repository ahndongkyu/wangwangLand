begin;

alter table public.events add column if not exists application_block text not null default 'none'
  check (application_block in ('none','volunteer','adoption','both'));
alter table public.volunteer_applications add column if not exists reschedule_party_size integer
  check (reschedule_party_size between 1 and 30);

-- 날짜 단위 제한. 종료 시각이 다음 날 00:00이면 다음 날은 포함하지 않는다.
create or replace function public.application_day_block_reason(p_day date, p_kind text, p_people integer default 1)
returns text language sql stable security definer set search_path=public as $$
  select case when e.category::text='closed' then '휴무일'
    when e.category::text='regular_volunteer' then '정기봉사일에는 5명 이상 단체 신청 제한'
    else '행사로 신청 제한' end
  from events e
  where e.starts_at < ((p_day+1)::timestamp at time zone 'Asia/Seoul')
    and (e.ends_at > (p_day::timestamp at time zone 'Asia/Seoul')
      or e.starts_at >= (p_day::timestamp at time zone 'Asia/Seoul'))
    and (e.category::text='closed'
      or (e.category::text='event' and e.application_block in (p_kind,'both'))
      or (p_kind='volunteer' and p_people>=5 and e.category::text='regular_volunteer'))
  order by (e.category::text='closed') desc limit 1
$$;
revoke all on function public.application_day_block_reason(date,text,integer) from public,anon,authenticated;

-- 일정 제목·신청자 정보를 공개하지 않고 날짜별 제한만 반환한다.
create or replace function public.application_blocked_dates(p_from date,p_to date,p_kind text,p_people integer default 1)
returns table(day date,reason text) language plpgsql stable security definer set search_path=public as $$
begin
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>93
    or p_kind is null or p_kind not in ('volunteer','adoption') or p_people is null or p_people not between 1 and 30 then
    raise exception '조회 범위를 확인해주세요.';
  end if;
  return query select d::date, public.application_day_block_reason(d::date,p_kind,p_people)
    from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d
    where public.application_day_block_reason(d::date,p_kind,p_people) is not null;
end $$;
revoke all on function public.application_blocked_dates(date,date,text,integer) from public;
grant execute on function public.application_blocked_dates(date,date,text,integer) to anon,authenticated,service_role;

create or replace function public.guard_application_calendar_dates()
returns trigger language plpgsql security definer set search_path=public as $$
declare days date[]; d date; reason text; kind text; people integer:=1;
begin
  perform pg_advisory_xact_lock(32027);
  if tg_table_name='volunteer_applications' then
    if new.status::text <> '일정변경요청' then new.reschedule_party_size:=null; end if;
    kind:='volunteer'; people:=new.party_size;
    if new.status::text='일정변경요청' then
      days:=new.reschedule_dates::date[]; people:=coalesce(new.reschedule_party_size,new.party_size);
    elsif new.status::text in ('접수','검토중') then days:=new.available_dates::date[];
    else return new; end if;
    if tg_op='UPDATE' and new.status=old.status and new.party_size=old.party_size
      and new.available_dates is not distinct from old.available_dates
      and new.reschedule_dates is not distinct from old.reschedule_dates
      and new.reschedule_time is not distinct from old.reschedule_time
      and new.reschedule_party_size is not distinct from old.reschedule_party_size then return new; end if;
  else
    kind:='adoption';
    if new.status::text not in ('접수','검토중') then return new; end if;
    days:=new.visit_available_dates::date[];
    if tg_op='UPDATE' and new.status=old.status and new.visit_available_dates is not distinct from old.visit_available_dates then return new; end if;
  end if;
  foreach d in array coalesce(days,'{}'::date[]) loop
    reason:=public.application_day_block_reason(d,kind,people);
    if reason is not null then raise exception '신청 제한: % · %',d,reason; end if;
  end loop;
  return new;
end $$;
create trigger guard_volunteer_calendar_dates before insert or update on public.volunteer_applications
  for each row execute function public.guard_application_calendar_dates();
create trigger guard_adoption_calendar_dates before insert or update on public.adoption_applications
  for each row execute function public.guard_application_calendar_dates();

create or replace function public.guard_event_application_dates()
returns trigger language plpgsql security definer set search_path=public as $$
declare reason text; people integer:=1;
begin
  perform pg_advisory_xact_lock(32027);
  if new.category::text='closed' then new.application_block:='both';
  elsif new.category::text<>'event' then new.application_block:='none'; end if;
  if new.source_application_type in ('volunteer','adoption') and new.source_application_id is not null then
    if tg_op='UPDATE' and new.starts_at=old.starts_at
      and new.source_application_id is not distinct from old.source_application_id
      and new.source_application_type is not distinct from old.source_application_type then return new; end if;
    if new.source_application_type='volunteer' then
      select party_size into people from volunteer_applications where id=new.source_application_id;
    end if;
    reason:=public.application_day_block_reason((new.starts_at at time zone 'Asia/Seoul')::date,new.source_application_type,coalesce(people,1));
    if reason is not null then raise exception '신청 제한: % · %',(new.starts_at at time zone 'Asia/Seoul')::date,reason; end if;
  end if;
  return new;
end $$;
create trigger guard_event_application_dates before insert or update on public.events
  for each row execute function public.guard_event_application_dates();

-- 기존 버전 검사·원자적 일정 교체를 그대로 사용하며 요청 인원만 같은 트랜잭션에서 확정한다.
alter function public.process_volunteer_application_checked(uuid,public.application_status,text,text,text,timestamptz[],boolean,uuid,public.application_status,timestamptz)
  rename to process_volunteer_application_before_party_change;
create function public.process_volunteer_application_checked(
  p_application_id uuid,p_status public.application_status,p_admin_note text,p_cancel_reason text,
  p_schedule_action text,p_schedule_starts timestamptz[],p_clear_reschedule boolean,p_created_by uuid,
  p_expected_status public.application_status,p_expected_updated_at timestamptz
) returns integer language plpgsql security definer set search_path=public as $$
declare a public.volunteer_applications%rowtype; revision timestamptz; result integer;
begin
  perform pg_advisory_xact_lock(32027);
  select * into a from volunteer_applications where id=p_application_id for update;
  if not found then raise exception '신청을 찾을 수 없습니다.'; end if;
  if p_expected_updated_at is null or a.updated_at is distinct from p_expected_updated_at or a.status is distinct from p_expected_status then
    raise exception '처리 중 신청 상태나 내용이 변경되었습니다. 신청 내역을 새로 확인해주세요.';
  end if;
  revision:=a.updated_at;
  if a.status::text='일정변경요청' and p_status::text='승인' and p_schedule_action='replace' then
    update volunteer_applications set party_size=coalesce(reschedule_party_size,party_size)
      where id=p_application_id returning updated_at into revision;
  end if;
  result:=public.process_volunteer_application_before_party_change(p_application_id,p_status,p_admin_note,p_cancel_reason,
    p_schedule_action,p_schedule_starts,p_clear_reschedule,p_created_by,p_expected_status,revision);
  if p_clear_reschedule then update volunteer_applications set reschedule_party_size=null where id=p_application_id; end if;
  return result;
end $$;
revoke all on function public.process_volunteer_application_checked(uuid,public.application_status,text,text,text,timestamptz[],boolean,uuid,public.application_status,timestamptz) from public,anon,authenticated;
grant execute on function public.process_volunteer_application_checked(uuid,public.application_status,text,text,text,timestamptz[],boolean,uuid,public.application_status,timestamptz) to service_role;
create or replace function public.mutate_event_checked(
  p_event_id uuid, p_scope text, p_operation text, p_expected jsonb, p_fields jsonb
) returns uuid[]
language plpgsql security definer set search_path = public
as $$
declare
  v_anchor public.events%rowtype;
  v_fields public.events%rowtype;
  v_check_ids uuid[];
  v_ids uuid[];
begin
  if p_scope is null or p_scope not in ('one', 'after', 'all')
    or p_operation is null or p_operation not in ('update', 'delete') then
    raise exception 'INVALID_EVENT_OPERATION';
  end if;
  if p_expected is null or jsonb_typeof(p_expected) <> 'array' then
    raise exception 'EVENT_REVISION_CONFLICT';
  end if;
  lock table public.events in share row exclusive mode;
  select * into v_anchor from public.events where id = p_event_id;
  if not found then raise exception 'EVENT_REVISION_CONFLICT'; end if;

  select array_agg(id order by id) into v_check_ids from public.events
    where id = p_event_id or (p_scope <> 'one' and v_anchor.recurrence_group_id is not null
      and recurrence_group_id = v_anchor.recurrence_group_id);
  if jsonb_array_length(p_expected) <> cardinality(v_check_ids)
    or (select count(distinct x.id) from jsonb_to_recordset(p_expected) as x(id uuid, updated_at timestamptz)) <> cardinality(v_check_ids)
    or exists (
      select 1 from public.events e
      where e.id = any(v_check_ids) and not exists (
        select 1 from jsonb_to_recordset(p_expected) as x(id uuid, updated_at timestamptz)
        where x.id = e.id and x.updated_at = e.updated_at
      )
    ) then raise exception 'EVENT_REVISION_CONFLICT'; end if;

  select array_agg(id order by id) into v_ids from public.events
    where id = any(v_check_ids) and (p_scope <> 'after' or starts_at >= v_anchor.starts_at);
  if p_operation = 'delete' then
    delete from public.events where id = any(v_ids);
    return v_ids;
  end if;

  select * into v_fields from jsonb_populate_record(null::public.events, p_fields);
  if v_fields.title is null or btrim(v_fields.title) = '' or v_fields.starts_at is null
    or v_fields.ends_at is null or v_fields.ends_at < v_fields.starts_at or v_fields.category is null then
    raise exception 'INVALID_EVENT_FIELDS';
  end if;
  update public.events e set
    application_block = coalesce(v_fields.application_block, 'none'),
    title = v_fields.title, description = v_fields.description, location = v_fields.location,
    category = v_fields.category, custom_label = v_fields.custom_label, custom_color = v_fields.custom_color,
    signup_enabled = coalesce(v_fields.signup_enabled, false), visibility = v_fields.visibility,
    all_day = coalesce(v_fields.all_day, false),
    starts_at = case when p_scope = 'one' or v_anchor.recurrence_group_id is null then v_fields.starts_at else
      (((e.starts_at at time zone 'Asia/Seoul')::date + (v_fields.starts_at at time zone 'Asia/Seoul')::time)
        at time zone 'Asia/Seoul') end,
    ends_at = case when p_scope = 'one' or v_anchor.recurrence_group_id is null then v_fields.ends_at else
      (((e.starts_at at time zone 'Asia/Seoul')::date + (v_fields.starts_at at time zone 'Asia/Seoul')::time)
        at time zone 'Asia/Seoul') + (v_fields.ends_at - v_fields.starts_at) end
    where e.id = any(v_ids);
  return v_ids;
end;
$$;

create or replace function public.application_calendar_conflicts(p_from timestamptz,p_to timestamptz)
returns table(event_id uuid,reason text) language plpgsql stable security definer set search_path=public as $$
begin
  if not coalesce(public.is_admin(),false) then raise exception '관리자 권한이 필요합니다.'; end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>interval '93 days' then raise exception '조회 범위를 확인해주세요.'; end if;
  return query select e.id,public.application_day_block_reason((e.starts_at at time zone 'Asia/Seoul')::date,e.source_application_type,coalesce(a.party_size,1))
  from events e left join volunteer_applications a on e.source_application_type='volunteer' and a.id=e.source_application_id
  where e.source_application_id is not null and e.source_application_type in ('volunteer','adoption')
    and e.starts_at>=greatest(p_from,now()) and e.starts_at<p_to
    and public.application_day_block_reason((e.starts_at at time zone 'Asia/Seoul')::date,e.source_application_type,coalesce(a.party_size,1)) is not null;
end $$;
revoke all on function public.application_calendar_conflicts(timestamptz,timestamptz) from public,anon;
grant execute on function public.application_calendar_conflicts(timestamptz,timestamptz) to authenticated;
commit;
