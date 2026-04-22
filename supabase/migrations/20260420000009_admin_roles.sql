-- ============================================================================
-- 어드민 역할 분리 (최고관리자 / 관리자)
--   - admin    = 최고관리자: 모든 권한 (생성·수정·삭제, 어드민 관리)
--   - editor   = 관리자: 생성·수정만 가능, 삭제 X, 어드민 관리 X
-- 기존 "Admins can manage X" 통합 정책을 역할별 인서트/업데이트/삭제로 분리.
-- Idempotent.
-- ============================================================================

-- ---- 1. 헬퍼 함수 ----
create or replace function is_top_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admins
     where admins.user_id = auth.uid()
       and admins.role = 'admin'
  );
$$;

-- ---- 2. dogs ----
drop policy if exists "Admins can manage dogs" on dogs;

create policy "Admins can insert dogs" on dogs
  for insert with check (is_admin());
create policy "Admins can update dogs" on dogs
  for update using (is_admin()) with check (is_admin());
create policy "Top admins can delete dogs" on dogs
  for delete using (is_top_admin());

-- ---- 3. cats ----
drop policy if exists "Admins can manage cats" on cats;

create policy "Admins can insert cats" on cats
  for insert with check (is_admin());
create policy "Admins can update cats" on cats
  for update using (is_admin()) with check (is_admin());
create policy "Top admins can delete cats" on cats
  for delete using (is_top_admin());

-- ---- 4. notices ----
drop policy if exists "Admins can manage notices" on notices;

create policy "Admins can insert notices" on notices
  for insert with check (is_admin());
create policy "Admins can update notices" on notices
  for update using (is_admin()) with check (is_admin());
create policy "Top admins can delete notices" on notices
  for delete using (is_top_admin());

-- ---- 5. daily_posts ----
drop policy if exists "Admins can manage daily posts" on daily_posts;

create policy "Admins can insert daily posts" on daily_posts
  for insert with check (is_admin());
create policy "Admins can update daily posts" on daily_posts
  for update using (is_admin()) with check (is_admin());
create policy "Top admins can delete daily posts" on daily_posts
  for delete using (is_top_admin());

-- ---- 6. adoption_stories ----
drop policy if exists "Admins can manage stories" on adoption_stories;

create policy "Admins can insert stories" on adoption_stories
  for insert with check (is_admin());
create policy "Admins can update stories" on adoption_stories
  for update using (is_admin()) with check (is_admin());
create policy "Top admins can delete stories" on adoption_stories
  for delete using (is_top_admin());

-- ---- 7. adoption_applications / volunteer_applications ----
-- 기존 delete 정책을 is_admin() → is_top_admin() 으로 좁힘
drop policy if exists "Admins can delete adoption applications" on adoption_applications;
create policy "Top admins can delete adoption applications" on adoption_applications
  for delete using (is_top_admin());

drop policy if exists "Admins can delete volunteer applications" on volunteer_applications;
create policy "Top admins can delete volunteer applications" on volunteer_applications
  for delete using (is_top_admin());

-- ---- 8. admins 테이블 ----
-- 이미 "Admin role can manage admins" 정책이 있어 admin(최고관리자)만 관리 가능.
-- 추가 가드: 최소 1명의 최고관리자는 반드시 유지되도록 트리거로 보호.
create or replace function ensure_at_least_one_top_admin()
returns trigger
language plpgsql
security definer
as $$
declare
  remaining_top_admins int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      select count(*) into remaining_top_admins
        from admins where role = 'admin' and id != old.id;
      if remaining_top_admins = 0 then
        raise exception '최고관리자는 최소 1명 이상 유지되어야 합니다.';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'admin' and new.role <> 'admin' then
      select count(*) into remaining_top_admins
        from admins where role = 'admin' and id != old.id;
      if remaining_top_admins = 0 then
        raise exception '최고관리자는 최소 1명 이상 유지되어야 합니다.';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admins_protect_last_top on admins;
create trigger trg_admins_protect_last_top
  before update or delete on admins
  for each row execute function ensure_at_least_one_top_admin();

comment on function is_top_admin() is '현재 사용자가 admin(최고관리자) 역할인지';
comment on function ensure_at_least_one_top_admin() is '최고관리자 최소 1명 유지 보호 트리거';
