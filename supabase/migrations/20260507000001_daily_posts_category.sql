-- daily_posts 에 카테고리 필드 추가
-- 값: '구조 소식' | '봉사 현장' | '시설 안내' | NULL

ALTER TABLE daily_posts
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;
