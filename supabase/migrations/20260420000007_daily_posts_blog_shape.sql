-- ============================================================================
-- daily_posts를 블로그 포스트 형태로 확장
-- - title 컬럼 신설 (NOT NULL)
-- - 기존 caption → content 로 의미 명확화
-- ============================================================================

alter table daily_posts
  rename column caption to content;

alter table daily_posts
  add column title text;

-- 기존 행이 있다면 임시값으로 채워서 NOT NULL 전환
update daily_posts
   set title = coalesce(nullif(left(content, 30), ''), '왕왕랜드 일상')
 where title is null;

alter table daily_posts
  alter column title set not null;

comment on column daily_posts.title is '일상 글 제목 (예: 4.21.화 왕왕랜드 일상)';
comment on column daily_posts.content is '본문 — 봉사 활동, 아이들 근황 등을 자유롭게 작성';
