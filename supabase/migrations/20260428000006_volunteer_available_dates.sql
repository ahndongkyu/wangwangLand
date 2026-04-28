-- 봉사 신청 시 가능 날짜를 캘린더에서 직접 선택할 수 있게 컬럼 추가.
-- 기존 available_days(요일) 는 호환성을 위해 그대로 유지하되 신규 폼은 available_dates 우선 사용.

alter table volunteer_applications
  add column available_dates date[] not null default '{}'::date[];

comment on column volunteer_applications.available_dates is
  '회원이 캘린더 픽커로 선택한 가능 날짜 목록. 비어있으면 available_days(요일) 만 참고.';
