-- 푸시 알림 구독 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 회원: 자기 구독만 관리
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 비로그인 사용자도 구독 가능 (user_id = null)
DROP POLICY IF EXISTS "Anonymous can insert" ON push_subscriptions;
CREATE POLICY "Anonymous can insert" ON push_subscriptions
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- 비로그인은 endpoint로만 자기 구독 삭제 가능
DROP POLICY IF EXISTS "Anonymous can delete by endpoint" ON push_subscriptions;
CREATE POLICY "Anonymous can delete by endpoint" ON push_subscriptions
  FOR DELETE
  USING (user_id IS NULL);
