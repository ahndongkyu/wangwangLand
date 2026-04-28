-- 회원 약관/개인정보 동의 기록 컬럼
-- 카카오 OAuth 로 인증 후 onboarding 단계에서 약관 동의를 받고
-- 그 시각·버전을 보관 (분쟁 시 증빙 + 약관 개정 추적).

alter table profiles
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists marketing_agreed_at timestamptz;

comment on column profiles.terms_agreed_at is '이용약관 동의 시각 (NULL = 미동의)';
comment on column profiles.terms_version is '동의한 약관 버전 (예: 2026-04-27)';
comment on column profiles.privacy_agreed_at is '개인정보 처리방침 동의 시각';
comment on column profiles.privacy_version is '동의한 개인정보 처리방침 버전';
comment on column profiles.marketing_agreed_at is '마케팅 수신 동의 시각 (선택, NULL = 미동의)';
