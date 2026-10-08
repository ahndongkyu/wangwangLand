begin;

-- 본인 신청 취소와 연결 일정 삭제를 함께 확정하거나 함께 롤백한다.
create or replace function public.cancel_own_application_with_events(
  p_application_id uuid,
  p_application_type text,
  p_cancel_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if nullif(btrim(p_cancel_reason), '') is null then
    raise exception '취소 사유를 입력해주세요.';
  end if;

  if p_application_type = 'volunteer' then
    select created_by, status into v_owner, v_status
    from public.volunteer_applications where id = p_application_id for update;
  elsif p_application_type = 'adoption' then
    select created_by, status into v_owner, v_status
    from public.adoption_applications where id = p_application_id for update;
  else
    raise exception '지원하지 않는 신청 유형입니다.';
  end if;
  if not found then
    raise exception '신청을 찾을 수 없습니다.';
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception '본인 신청만 취소할 수 있습니다.';
  end if;
  if v_status = '취소' then
    raise exception '이미 취소된 신청입니다.';
  end if;

  delete from public.events
  where source_application_type = p_application_type
    and source_application_id = p_application_id;

  if p_application_type = 'volunteer' then
    update public.volunteer_applications
    set status = '취소', cancel_reason = btrim(p_cancel_reason),
        reschedule_dates = null, reschedule_time = null
    where id = p_application_id;
  else
    update public.adoption_applications
    set status = '취소', cancel_reason = btrim(p_cancel_reason)
    where id = p_application_id;
  end if;
end;
$$;

revoke all on function public.cancel_own_application_with_events(uuid, text, text) from public, anon;
grant execute on function public.cancel_own_application_with_events(uuid, text, text) to authenticated;
commit;
