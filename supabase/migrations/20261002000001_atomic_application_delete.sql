-- 신청과 연결 일정을 하나의 트랜잭션으로 삭제한다.
-- 기존 승인 함수와 같은 신청 행 잠금을 사용하여 승인/삭제 경합을 직렬화한다.
begin;

create or replace function public.delete_application_with_events(
  p_application_id uuid,
  p_application_type text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_application_type = 'volunteer' then
    perform id from public.volunteer_applications where id = p_application_id for update;
  elsif p_application_type = 'adoption' then
    perform id from public.adoption_applications where id = p_application_id for update;
  else
    raise exception '지원하지 않는 신청 유형입니다.';
  end if;
  if not found then
    raise exception '신청을 찾을 수 없습니다.';
  end if;

  delete from public.events
  where source_application_type = p_application_type
    and source_application_id = p_application_id;

  if p_application_type = 'volunteer' then
    delete from public.volunteer_applications where id = p_application_id;
  else
    delete from public.adoption_applications where id = p_application_id;
  end if;
end;
$$;

revoke all on function public.delete_application_with_events(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_application_with_events(uuid, text) to service_role;
commit;
