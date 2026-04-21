-- ============================================================================
-- 입양 신청서 email 필수 해제 (선택 항목)
-- ============================================================================

alter table adoption_applications
  alter column email drop not null;

comment on column adoption_applications.email is '이메일 (선택)';
