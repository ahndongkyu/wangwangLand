-- 정기봉사 카테고리 + 반복(정기) 일정 그룹.
-- regular_volunteer: 매주/매월 반복 생성되는 정기 봉사 일정 (로즈 색).
-- recurrence_group_id: 한 번의 반복 설정으로 생성된 일정들을 묶는 ID.
--   같은 그룹끼리 "이 반복 전체 삭제" 등 일괄 처리에 사용.

alter type event_category add value if not exists 'regular_volunteer';

alter table events
  add column if not exists recurrence_group_id uuid;

create index if not exists idx_events_recurrence_group
  on events (recurrence_group_id);

comment on column events.recurrence_group_id is
  '반복 설정으로 함께 생성된 일정 묶음 ID. 단건 일정은 null.';
