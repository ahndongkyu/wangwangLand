-- ============================================================================
-- Fix: admins 테이블 RLS 정책 무한 재귀 버그
-- 원인: 'Admin role can view all admins' 정책이 admins를 서브쿼리로 다시 조회하여
--       정책 평가 중 같은 정책을 재귀 호출 → "infinite recursion detected"
-- 해결: is_admin() 함수 (SECURITY DEFINER) 를 이용해 RLS 우회
-- ============================================================================

drop policy if exists "Admin role can view all admins" on admins;
drop policy if exists "Admin role can manage admins" on admins;

create policy "Admins can view other admins"
  on admins for select
  using (is_admin());

create policy "Admins can manage other admins"
  on admins for all
  using (is_admin())
  with check (is_admin());
