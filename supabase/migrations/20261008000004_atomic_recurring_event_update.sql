begin;

-- 날짜는 KST 기준으로 유지하고 공통 항목만 한 문장에서 변경한다.
create or replace function public.update_recurring_events_atomic(
  p_event_id uuid, p_scope text, p_fields jsonb
) returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anchor public.events%rowtype;
  v_fields public.events%rowtype;
  v_ids uuid[];
begin
  if p_scope is null or p_scope not in ('after', 'all') then
    raise exception '반복 수정 범위가 올바르지 않습니다.';
  end if;
  select * into v_anchor from public.events where id = p_event_id for update;
  if not found then raise exception '일정을 찾을 수 없습니다.'; end if;
  select * into v_fields from jsonb_populate_record(null::public.events, p_fields);
  if v_fields.title is null or btrim(v_fields.title) = '' or v_fields.starts_at is null
     or v_fields.ends_at is null or v_fields.ends_at < v_fields.starts_at
     or v_fields.category is null then
    raise exception '일정 입력값을 확인해주세요.';
  end if;

  with changed as (
    update public.events e set
      title = v_fields.title, description = v_fields.description, location = v_fields.location,
      category = v_fields.category, custom_label = v_fields.custom_label, custom_color = v_fields.custom_color,
      signup_enabled = coalesce(v_fields.signup_enabled, false), visibility = v_fields.visibility,
      all_day = coalesce(v_fields.all_day, false),
      starts_at = case when v_anchor.recurrence_group_id is null then v_fields.starts_at else
        (((e.starts_at at time zone 'Asia/Seoul')::date +
          case when v_fields.all_day then time '00:00' else (v_fields.starts_at at time zone 'Asia/Seoul')::time end)
          at time zone 'Asia/Seoul') end,
      ends_at = case when v_anchor.recurrence_group_id is null then v_fields.ends_at else
        (((e.starts_at at time zone 'Asia/Seoul')::date +
          case when v_fields.all_day then time '23:59:59' else (v_fields.starts_at at time zone 'Asia/Seoul')::time end)
          at time zone 'Asia/Seoul') end
    where (v_anchor.recurrence_group_id is null and e.id = v_anchor.id)
      or (v_anchor.recurrence_group_id is not null and e.recurrence_group_id = v_anchor.recurrence_group_id
          and (p_scope = 'all' or e.starts_at >= v_anchor.starts_at))
    returning e.id
  ) select coalesce(array_agg(id), '{}'::uuid[]) into v_ids from changed;
  return v_ids;
end;
$$;

revoke all on function public.update_recurring_events_atomic(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.update_recurring_events_atomic(uuid, text, jsonb) to service_role;
commit;
