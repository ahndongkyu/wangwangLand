begin;

-- 비교와 쓰기 사이의 수정·삭제 및 반복 그룹 삽입을 함께 직렬화한다.
-- 짧은 DB 트랜잭션 안에서만 잠그며 알림 발송은 포함하지 않는다.
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

revoke all on function public.mutate_event_checked(uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.mutate_event_checked(uuid, text, text, jsonb, jsonb) to service_role;
commit;
