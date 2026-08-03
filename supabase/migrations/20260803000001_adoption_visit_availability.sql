-- 입양 상담·보호소 방문 일정 조율용 신청자 가능 날짜와 시간.
-- 기존 신청 데이터는 날짜가 빈 배열, 시간은 NULL로 보존한다.

alter table adoption_applications
  add column if not exists visit_available_dates date[] not null default '{}'::date[],
  add column if not exists visit_available_time text;

comment on column adoption_applications.visit_available_dates is
  '입양 신청자가 선택한 왕왕랜드 방문 가능 날짜 (YYYY-MM-DD 배열). 상담 일정 조율용.';

comment on column adoption_applications.visit_available_time is
  '입양 신청자가 선택한 왕왕랜드 방문 가능 시간 (HH:MM). 상담 일정 조율용.';
