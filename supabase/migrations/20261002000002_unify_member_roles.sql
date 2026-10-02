-- 일반회원/정회원 통합. 신청, 게시글, 승인 상태, 차단 여부는 변경하지 않는다.
-- 기존 enum 값은 외부 의존성을 위해 유지하되 CHECK로 재할당을 차단한다.
begin;

update public.profiles set role = 'member' where role::text = 'full_member';

alter table public.profiles drop constraint if exists profiles_unified_member_role_check;
alter table public.profiles add constraint profiles_unified_member_role_check
  check (role::text in ('member', 'staff', 'admin')) not valid;
alter table public.profiles validate constraint profiles_unified_member_role_check;

commit;
