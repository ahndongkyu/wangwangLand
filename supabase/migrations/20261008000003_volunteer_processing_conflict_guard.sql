begin;

-- 신청 행을 잠근 뒤 읽었던 상태·수정 시각이 그대로인지 확인한다.
-- 회원 수정이 먼저 저장되었다면 이전 날짜로 일정을 생성하지 않는다.
create or replace function public.process_volunteer_application_checked(
  p_application_id uuid,
  p_status public.application_status,
  p_admin_note text,
  p_cancel_reason text,
  p_schedule_action text,
  p_schedule_starts timestamptz[],
  p_clear_reschedule boolean,
  p_created_by uuid,
  p_expected_status public.application_status,
  p_expected_updated_at timestamptz
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.volunteer_applications%rowtype;
begin
  select * into v_app from public.volunteer_applications
    where id = p_application_id for update;
  if not found then
    raise exception '신청을 찾을 수 없습니다.';
  end if;
  if p_expected_updated_at is null
     or v_app.status is distinct from p_expected_status
     or v_app.updated_at is distinct from p_expected_updated_at then
    raise exception '처리 중 신청 상태나 내용이 변경되었습니다. 신청 내역을 새로 확인해주세요.';
  end if;
  return public.process_volunteer_application(
    p_application_id, p_status, p_admin_note, p_cancel_reason,
    p_schedule_action, p_schedule_starts, p_clear_reschedule, p_created_by
  );
end;
$$;

revoke all on function public.process_volunteer_application_checked(
  uuid, public.application_status, text, text, text, timestamptz[], boolean, uuid,
  public.application_status, timestamptz
) from public, anon, authenticated;
grant execute on function public.process_volunteer_application_checked(
  uuid, public.application_status, text, text, text, timestamptz[], boolean, uuid,
  public.application_status, timestamptz
) to service_role;
commit;
