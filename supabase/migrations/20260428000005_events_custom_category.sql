-- 카테고리 직접 입력 + 색상 커스텀.
-- 기본 3종(volunteer/event/closed) 외에 'custom' 카테고리를 추가하고,
-- custom_label / custom_color 로 운영진이 자유 입력.

alter type event_category add value if not exists 'custom';

alter table events
  add column custom_label text,
  add column custom_color text;

comment on column events.custom_label is
  'category=custom 일 때 표시할 카테고리 이름. 기본 카테고리에서는 null.';
comment on column events.custom_color is
  '#RRGGBB 헥스 코드. category=custom 일 때만 사용. null 이면 기본 회색.';

-- custom 카테고리는 label/color 가 있어야 의미가 있음 (강제는 안 하되 가이드).
-- 헥스 형식 가벼운 검증
alter table events
  add constraint chk_event_custom_color
  check (custom_color is null or custom_color ~ '^#[0-9A-Fa-f]{6}$');
