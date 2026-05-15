-- ============================================================================
-- 동물 좋아요(하트) DB 기반 전환
--  - dog_likes, cat_likes 테이블 생성 (user_id + animal_id PK, 중복 방지)
--  - RLS: 본인 likes만 SELECT, 로그인 유저만 insert/delete
--  - toggle_dog_like / toggle_cat_like: 토글 후 {liked, count} 반환
--  - check_dog_liked / check_cat_liked: 현재 유저 liked 여부
-- ============================================================================

-- ---- 1. dog_likes 테이블 ----
create table if not exists dog_likes (
  user_id  uuid not null references auth.users(id) on delete cascade,
  dog_id   uuid not null references dogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, dog_id)
);

-- ---- 2. cat_likes 테이블 ----
create table if not exists cat_likes (
  user_id  uuid not null references auth.users(id) on delete cascade,
  cat_id   uuid not null references cats(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cat_id)
);

-- ---- 3. RLS 활성화 ----
alter table dog_likes enable row level security;
alter table cat_likes enable row level security;

-- dog_likes RLS 정책
create policy "dog_likes_select_own" on dog_likes
  for select using (auth.uid() = user_id);

create policy "dog_likes_insert_own" on dog_likes
  for insert with check (auth.uid() = user_id);

create policy "dog_likes_delete_own" on dog_likes
  for delete using (auth.uid() = user_id);

-- cat_likes RLS 정책
create policy "cat_likes_select_own" on cat_likes
  for select using (auth.uid() = user_id);

create policy "cat_likes_insert_own" on cat_likes
  for insert with check (auth.uid() = user_id);

create policy "cat_likes_delete_own" on cat_likes
  for delete using (auth.uid() = user_id);

-- ---- 4. toggle_dog_like RPC ----
create or replace function toggle_dog_like(p_dog_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid;
  v_liked   boolean;
  v_count   int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from dog_likes where user_id = v_uid and dog_id = p_dog_id) then
    -- 이미 좋아요 → 취소
    delete from dog_likes where user_id = v_uid and dog_id = p_dog_id;
    update dogs set like_count = greatest(0, like_count - 1) where id = p_dog_id;
    v_liked := false;
  else
    -- 좋아요 추가
    insert into dog_likes (user_id, dog_id) values (v_uid, p_dog_id);
    update dogs set like_count = like_count + 1 where id = p_dog_id;
    v_liked := true;
  end if;

  select like_count into v_count from dogs where id = p_dog_id;
  return json_build_object('liked', v_liked, 'count', v_count);
end;
$$;

-- ---- 5. toggle_cat_like RPC ----
create or replace function toggle_cat_like(p_cat_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid;
  v_liked   boolean;
  v_count   int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from cat_likes where user_id = v_uid and cat_id = p_cat_id) then
    -- 이미 좋아요 → 취소
    delete from cat_likes where user_id = v_uid and cat_id = p_cat_id;
    update cats set like_count = greatest(0, like_count - 1) where id = p_cat_id;
    v_liked := false;
  else
    -- 좋아요 추가
    insert into cat_likes (user_id, cat_id) values (v_uid, p_cat_id);
    update cats set like_count = like_count + 1 where id = p_cat_id;
    v_liked := true;
  end if;

  select like_count into v_count from cats where id = p_cat_id;
  return json_build_object('liked', v_liked, 'count', v_count);
end;
$$;

-- ---- 6. check_dog_liked RPC ----
create or replace function check_dog_liked(p_dog_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from dog_likes
    where user_id = auth.uid() and dog_id = p_dog_id
  );
$$;

-- ---- 7. check_cat_liked RPC ----
create or replace function check_cat_liked(p_cat_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from cat_likes
    where user_id = auth.uid() and cat_id = p_cat_id
  );
$$;

-- ---- 8. authenticated role에 execute 권한 부여 ----
grant execute on function toggle_dog_like(uuid) to authenticated;
grant execute on function toggle_cat_like(uuid) to authenticated;
grant execute on function check_dog_liked(uuid) to authenticated;
grant execute on function check_cat_liked(uuid) to authenticated;
