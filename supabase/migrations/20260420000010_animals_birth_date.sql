-- ============================================================================
-- dogs / cats 에 birth_date 컬럼 추가
--  - 생년월일을 정확히 알 때 저장 → age_months 는 이로부터 자동 계산
--  - 모를 때는 기존 age_months 를 직접 입력하는 fallback 유지
--  - 기존 rescue_date 컬럼은 데이터 보존을 위해 삭제하지 않음
--    (UI 에서는 생년월일로 대체되고 '특이사항' 에 텍스트로 기록 권장)
-- ============================================================================

alter table dogs
  add column if not exists birth_date date;

alter table cats
  add column if not exists birth_date date;

comment on column dogs.birth_date is '생년월일 (정확히 알 때만) — 나이는 이로부터 자동 계산';
comment on column cats.birth_date is '생년월일 (정확히 알 때만) — 나이는 이로부터 자동 계산';
