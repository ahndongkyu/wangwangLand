-- 봉사 일정변경 요청 기능

alter type application_status add value '일정변경요청';

alter table volunteer_applications
  add column if not exists reschedule_dates text[] default null,
  add column if not exists reschedule_time  text    default null;
