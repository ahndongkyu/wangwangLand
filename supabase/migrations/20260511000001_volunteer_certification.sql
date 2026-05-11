-- 봉사 인증을 daily_posts (category='봉사 후기') 로 활용.
-- 어떤 봉사 신청에 대한 후기인지 추적하기 위해 related_volunteer_application_id 컬럼 추가.
-- (created_by, related_volunteer_application_id) UNIQUE 로 같은 신청에 대한 중복 인증 방지.

ALTER TABLE daily_posts
  ADD COLUMN IF NOT EXISTS related_volunteer_application_id UUID
    REFERENCES volunteer_applications(id) ON DELETE SET NULL;

-- 같은 사용자가 같은 봉사 신청에 대해 1개만 인증글 작성 가능
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_post_volunteer_cert_unique
  ON daily_posts(created_by, related_volunteer_application_id)
  WHERE related_volunteer_application_id IS NOT NULL;

-- 카운트 빠른 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_posts_volunteer_cert
  ON daily_posts(created_by, category)
  WHERE category = '봉사 후기' AND related_volunteer_application_id IS NOT NULL;
