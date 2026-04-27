-- created_by FK를 admins(id) → profiles(id)로 변경
-- 매칭 안 되는 기존 데이터는 NULL 처리

-- notices
ALTER TABLE notices DROP CONSTRAINT IF EXISTS notices_created_by_fkey;
UPDATE notices n SET created_by = a.user_id
  FROM admins a WHERE n.created_by = a.id AND a.user_id IN (SELECT id FROM profiles);
UPDATE notices SET created_by = NULL
  WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM profiles);
ALTER TABLE notices ADD CONSTRAINT notices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- daily_posts
ALTER TABLE daily_posts DROP CONSTRAINT IF EXISTS daily_posts_created_by_fkey;
UPDATE daily_posts p SET created_by = a.user_id
  FROM admins a WHERE p.created_by = a.id AND a.user_id IN (SELECT id FROM profiles);
UPDATE daily_posts SET created_by = NULL
  WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM profiles);
ALTER TABLE daily_posts ADD CONSTRAINT daily_posts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- adoption_stories
ALTER TABLE adoption_stories DROP CONSTRAINT IF EXISTS adoption_stories_created_by_fkey;
UPDATE adoption_stories s SET created_by = a.user_id
  FROM admins a WHERE s.created_by = a.id AND a.user_id IN (SELECT id FROM profiles);
UPDATE adoption_stories SET created_by = NULL
  WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM profiles);
ALTER TABLE adoption_stories ADD CONSTRAINT adoption_stories_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
