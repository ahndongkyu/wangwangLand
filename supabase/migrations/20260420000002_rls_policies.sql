-- ============================================================================
-- Row Level Security (RLS) 정책
-- 정책:
--   - 공개 콘텐츠(dogs, notices, daily, stories): 모두 읽기 가능
--   - 신청서(adoption, volunteer): 누구나 제출 가능, 읽기/수정은 운영진만
--   - 운영진 관리 작업: 인증된 admins 테이블 멤버만
-- ============================================================================

-- 모든 테이블에 RLS 활성화
alter table admins enable row level security;
alter table dogs enable row level security;
alter table notices enable row level security;
alter table daily_posts enable row level security;
alter table adoption_stories enable row level security;
alter table adoption_applications enable row level security;
alter table volunteer_applications enable row level security;

-- ============================================================================
-- 헬퍼 함수: 현재 사용자가 운영진인지 확인
-- ============================================================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admins where admins.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- admins 테이블
-- ============================================================================

-- 운영진 본인만 자기 레코드 조회 가능
create policy "Admins can view self"
  on admins for select
  using (user_id = auth.uid());

-- admin 역할만 다른 운영진 조회 가능
create policy "Admin role can view all admins"
  on admins for select
  using (
    exists (
      select 1 from admins a
      where a.user_id = auth.uid() and a.role = 'admin'
    )
  );

-- admin 역할만 운영진 추가/수정/삭제
create policy "Admin role can manage admins"
  on admins for all
  using (
    exists (
      select 1 from admins a
      where a.user_id = auth.uid() and a.role = 'admin'
    )
  );

-- ============================================================================
-- dogs 테이블
-- ============================================================================

create policy "Anyone can view dogs"
  on dogs for select
  using (true);

create policy "Admins can manage dogs"
  on dogs for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- notices 테이블
-- ============================================================================

create policy "Anyone can view published notices"
  on notices for select
  using (published_at is not null);

create policy "Admins can view all notices"
  on notices for select
  using (is_admin());

create policy "Admins can manage notices"
  on notices for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- daily_posts 테이블
-- ============================================================================

create policy "Anyone can view daily posts"
  on daily_posts for select
  using (true);

create policy "Admins can manage daily posts"
  on daily_posts for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- adoption_stories 테이블
-- ============================================================================

create policy "Anyone can view published stories"
  on adoption_stories for select
  using (published_at is not null);

create policy "Admins can view all stories"
  on adoption_stories for select
  using (is_admin());

create policy "Admins can manage stories"
  on adoption_stories for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- adoption_applications 테이블 (신청)
-- ============================================================================

-- 누구나 제출 가능 (비회원 포함)
create policy "Anyone can submit adoption application"
  on adoption_applications for insert
  with check (privacy_agreed = true);

-- 조회/수정/삭제는 운영진만
create policy "Admins can view adoption applications"
  on adoption_applications for select
  using (is_admin());

create policy "Admins can update adoption applications"
  on adoption_applications for update
  using (is_admin())
  with check (is_admin());

create policy "Admins can delete adoption applications"
  on adoption_applications for delete
  using (is_admin());

-- ============================================================================
-- volunteer_applications 테이블 (봉사 신청)
-- ============================================================================

create policy "Anyone can submit volunteer application"
  on volunteer_applications for insert
  with check (privacy_agreed = true);

create policy "Admins can view volunteer applications"
  on volunteer_applications for select
  using (is_admin());

create policy "Admins can update volunteer applications"
  on volunteer_applications for update
  using (is_admin())
  with check (is_admin());

create policy "Admins can delete volunteer applications"
  on volunteer_applications for delete
  using (is_admin());
