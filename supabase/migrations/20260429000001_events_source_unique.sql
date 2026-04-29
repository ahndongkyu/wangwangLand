-- 봉사 신청 자동 등록 이벤트 중복 방지.
-- (source_application_type, source_application_id) 가 같으면 1행만 허용.
-- 신청과 무관한 일반 이벤트 (둘 다 NULL) 는 제약에서 제외 (PARTIAL UNIQUE).

create unique index if not exists uniq_events_source_application
  on events (source_application_type, source_application_id)
  where source_application_id is not null;

comment on index uniq_events_source_application is
  '한 신청당 자동 등록 이벤트 1개만 허용 (어드민 동시 승인 race 방지).';
