-- 게시글 조회수 컬럼 추가 (notices, daily_posts, adoption_stories)
-- + 익명 사용자도 카운트 증가 가능한 RPC

alter table notices add column if not exists view_count integer not null default 0;
alter table daily_posts add column if not exists view_count integer not null default 0;
alter table adoption_stories add column if not exists view_count integer not null default 0;

-- 인덱스는 따로 안 만듦 (조회수 정렬 기능이 없으므로)

-- 익명/회원 누구나 호출 가능. SECURITY DEFINER 로 RLS 우회.
-- p_table 검증으로 임의 테이블 update 방지.
create or replace function increment_post_view_count(
  p_table text,
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  if p_table = 'notices' then
    update notices set view_count = view_count + 1 where id = p_id;
  elsif p_table = 'daily_posts' then
    update daily_posts set view_count = view_count + 1 where id = p_id;
  elsif p_table = 'adoption_stories' then
    update adoption_stories set view_count = view_count + 1 where id = p_id;
  else
    raise exception 'invalid table: %', p_table;
  end if;
end;
$$;

grant execute on function increment_post_view_count(text, uuid) to anon, authenticated;
