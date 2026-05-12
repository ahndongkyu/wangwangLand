-- 신청 취소 기능: '취소' 상태 추가 + cancel_reason 컬럼

alter type application_status add value '취소';

alter table volunteer_applications
  add column if not exists cancel_reason text;

alter table adoption_applications
  add column if not exists cancel_reason text;
