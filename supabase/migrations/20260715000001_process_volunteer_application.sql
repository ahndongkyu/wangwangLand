-- 봉사 신청 상태 변경과 연결 일정 반영을 하나의 트랜잭션으로 처리한다.
-- 호출은 운영진 권한을 확인한 서버 액션에서 service_role 로만 허용한다.

create or replace function process_volunteer_application(
  p_application_id uuid,
  p_status application_status,
  p_admin_note text,
  p_cancel_reason text,
  p_schedule_action text,
  p_schedule_starts timestamptz[],
  p_clear_reschedule boolean,
  p_created_by uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app volunteer_applications%rowtype;
  v_inserted_count integer := 0;
  v_title text;
  v_description text;
begin
  if p_schedule_action not in ('keep', 'append', 'replace') then
    raise exception 'invalid schedule action';
  end if;

  select *
    into v_app
    from volunteer_applications
   where id = p_application_id
   for update;

  if not found then
    raise exception 'volunteer application not found';
  end if;

  update volunteer_applications
     set status = p_status,
         admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
         cancel_reason = case
           when p_status = '취소' then nullif(trim(coalesce(p_cancel_reason, '')), '')
           else null
         end,
         reschedule_dates = case when p_clear_reschedule then null else reschedule_dates end,
         reschedule_time = case when p_clear_reschedule then null else reschedule_time end
   where id = p_application_id;

  -- 승인 외 상태에는 캘린더 일정을 남기지 않는다.
  if p_status <> '승인' then
    delete from events
     where source_application_type = 'volunteer'
       and source_application_id = p_application_id;
    return 0;
  end if;

  if p_schedule_action = 'replace' then
    delete from events
     where source_application_type = 'volunteer'
       and source_application_id = p_application_id;
  end if;

  if coalesce(array_length(p_schedule_starts, 1), 0) = 0 then
    return 0;
  end if;

  v_title := case
    when coalesce(v_app.party_size, 1) > 1
      then v_app.applicant_name || ' 외 ' || (v_app.party_size - 1)::text || '명'
    else v_app.applicant_name
  end;
  v_description := nullif(concat_ws(E'\n',
    case
      when coalesce(array_length(v_app.activities, 1), 0) > 0
        then '희망 활동: ' || array_to_string(v_app.activities, ', ')
      else null
    end,
    case when v_app.available_time is not null then '요청 시간대: ' || v_app.available_time else null end,
    case when v_app.message is not null then '메모: ' || v_app.message else null end
  ), '');

  insert into events (
    category,
    title,
    description,
    starts_at,
    ends_at,
    all_day,
    signup_enabled,
    visibility,
    source_application_type,
    source_application_id,
    created_by
  )
  select
    'volunteer',
    v_title,
    v_description,
    starts_at,
    starts_at,
    false,
    false,
    'public',
    'volunteer',
    p_application_id,
    p_created_by
  from (
    select distinct unnest(p_schedule_starts) as starts_at
  ) selected
  on conflict (source_application_type, source_application_id, starts_at)
    where source_application_id is not null
  do nothing;

  get diagnostics v_inserted_count = row_count;

  -- 일정변경 승인 시 확정한 날짜와 시간을 신청 정보에도 반영한다.
  if p_schedule_action = 'replace' then
    update volunteer_applications
       set available_dates = array(
             select to_char(starts_at at time zone 'Asia/Seoul', 'YYYY-MM-DD')
             from unnest(p_schedule_starts) as selected(starts_at)
             order by starts_at
           ),
           available_time = to_char(p_schedule_starts[1] at time zone 'Asia/Seoul', 'HH24:MI')
     where id = p_application_id;
  end if;

  return v_inserted_count;
end;
$$;

revoke all on function process_volunteer_application(
  uuid, application_status, text, text, text, timestamptz[], boolean, uuid
) from public;

grant execute on function process_volunteer_application(
  uuid, application_status, text, text, text, timestamptz[], boolean, uuid
) to service_role;
