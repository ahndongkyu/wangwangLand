-- is_admin() 함수가 profiles.role 도 인정하도록 변경
-- 기존: admins 테이블에 있는 user만 인정
-- 변경: admins 테이블 OR profiles.role IN ('admin','staff')
--
-- 어드민 페이지 접근 로직(getCurrentAdmin)은 profiles.role 기반인데
-- RLS의 is_admin()은 admins 테이블만 봐서, profiles에 admin role이지만
-- admins 테이블엔 없는 사용자가 RLS에 의해 silent 차단되는 문제 해결.

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select
    exists (select 1 from admins where admins.user_id = auth.uid())
    or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'staff')
        and profiles.status = 'approved'
        and profiles.is_banned = false
    );
$$;

-- ============================================================================
-- 회원이 본인 글에 대한 INSERT/UPDATE/DELETE 가능하도록 정책 추가
-- (기존엔 admin only 정책이라 일반 회원이 silent 차단됨)
-- ============================================================================

-- 승인된 회원 여부 헬퍼
create or replace function is_approved_member()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.status = 'approved'
      and profiles.is_banned = false
  );
$$;

-- daily_posts: 승인된 회원은 본인 글 작성 가능
drop policy if exists "Members can insert own daily posts" on daily_posts;
create policy "Members can insert own daily posts"
  on daily_posts for insert
  with check (created_by = auth.uid() and is_approved_member());

-- daily_posts: 본인 글 수정/삭제 가능
drop policy if exists "Authors can update own daily posts" on daily_posts;
create policy "Authors can update own daily posts"
  on daily_posts for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "Authors can delete own daily posts" on daily_posts;
create policy "Authors can delete own daily posts"
  on daily_posts for delete
  using (created_by = auth.uid());

-- adoption_stories: 동일
drop policy if exists "Members can insert own stories" on adoption_stories;
create policy "Members can insert own stories"
  on adoption_stories for insert
  with check (created_by = auth.uid() and is_approved_member());

drop policy if exists "Authors can update own stories" on adoption_stories;
create policy "Authors can update own stories"
  on adoption_stories for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "Authors can delete own stories" on adoption_stories;
create policy "Authors can delete own stories"
  on adoption_stories for delete
  using (created_by = auth.uid());
