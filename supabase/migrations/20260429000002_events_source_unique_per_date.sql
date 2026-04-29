-- 한 신청당 여러 날짜로 일정을 등록할 수 있게 unique 키 변경.
-- (source_application_type, source_application_id, starts_at) 로 확장 →
-- 같은 시작 시각에는 1개만 허용 (race 시 중복 차단), 다른 날짜로는 여러 개 등록 가능.
-- 신청자가 가능 날짜를 여러 개 골라도 모두 일정으로 등록 가능해짐.

drop index if exists uniq_events_source_application;

create unique index uniq_events_source_application_date
  on events (source_application_type, source_application_id, starts_at)
  where source_application_id is not null;

comment on index uniq_events_source_application_date is
  '한 신청당 같은 시작 시각에는 1개만. 다른 날짜로는 여러 개 등록 가능.';
