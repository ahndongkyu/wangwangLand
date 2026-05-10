-- 운영진 상주 일정 테이블
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_avail_date ON staff_availability(date);
CREATE INDEX IF NOT EXISTS idx_staff_avail_user ON staff_availability(user_id);

ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- SELECT: 모두 (봉사자도 봐야 하니)
DROP POLICY IF EXISTS "Public can view staff availability" ON staff_availability;
CREATE POLICY "Public can view staff availability" ON staff_availability
  FOR SELECT
  USING (true);

-- INSERT: 운영진(admin/staff)만
DROP POLICY IF EXISTS "Staff can insert availability" ON staff_availability;
CREATE POLICY "Staff can insert availability" ON staff_availability
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- UPDATE: 운영진만
DROP POLICY IF EXISTS "Staff can update availability" ON staff_availability;
CREATE POLICY "Staff can update availability" ON staff_availability
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- DELETE: 운영진만
DROP POLICY IF EXISTS "Staff can delete availability" ON staff_availability;
CREATE POLICY "Staff can delete availability" ON staff_availability
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
