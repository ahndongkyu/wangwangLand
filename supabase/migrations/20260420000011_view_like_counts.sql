-- ============================================================================
-- 강아지·고양이 조회수 · 관심 하트 카운터
--  - view_count / like_count 컬럼 추가 (default 0)
--  - 비로그인 사용자도 카운트 증감할 수 있도록 SECURITY DEFINER RPC 제공
--  - RLS 를 직접 풀지 않아 익명 user 가 임의 값으로 덮어쓰는 것을 방지
-- ============================================================================

-- ---- 1. 컬럼 추가 (idempotent) ----
alter table dogs
  add column if not exists view_count int not null default 0,
  add column if not exists like_count int not null default 0;

alter table cats
  add column if not exists view_count int not null default 0,
  add column if not exists like_count int not null default 0;

-- ---- 2. RPC: 조회수 +1 ----
create or replace function increment_dog_view(p_dog_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update dogs set view_count = view_count + 1 where id = p_dog_id;
$$;

create or replace function increment_cat_view(p_cat_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update cats set view_count = view_count + 1 where id = p_cat_id;
$$;

-- ---- 3. RPC: 좋아요 +N (보통 +1 / -1) ----
create or replace function increment_dog_like(p_dog_id uuid, p_delta int)
returns int
language sql
security definer
set search_path = public
as $$
  update dogs
     set like_count = greatest(0, like_count + p_delta)
   where id = p_dog_id
  returning like_count;
$$;

create or replace function increment_cat_like(p_cat_id uuid, p_delta int)
returns int
language sql
security definer
set search_path = public
as $$
  update cats
     set like_count = greatest(0, like_count + p_delta)
   where id = p_cat_id
  returning like_count;
$$;

-- ---- 4. 익명 사용자에게도 실행 권한 부여 ----
grant execute on function increment_dog_view(uuid) to anon, authenticated;
grant execute on function increment_cat_view(uuid) to anon, authenticated;
grant execute on function increment_dog_like(uuid, int) to anon, authenticated;
grant execute on function increment_cat_like(uuid, int) to anon, authenticated;

comment on column dogs.view_count is '상세 페이지 조회수 (세션 1회 카운트)';
comment on column dogs.like_count is '관심 하트 총 수 (토글 — localStorage 에 사용자별 상태)';
comment on column cats.view_count is '상세 페이지 조회수 (세션 1회 카운트)';
comment on column cats.like_count is '관심 하트 총 수 (토글 — localStorage 에 사용자별 상태)';
