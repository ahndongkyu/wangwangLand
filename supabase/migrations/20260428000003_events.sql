-- 일정 캘린더 (봉사·행사·휴무)
-- 회원에게는 다가오는 일정 카드 리스트, 운영진에겐 월간 그리드.
-- 봉사 카테고리는 회원이 슬롯 신청 가능 (event_signups).

-- ============================================================================
-- events
-- ============================================================================
create type event_category as enum ('volunteer', 'event', 'closed');

create table events (
  id uuid primary key default uuid_generate_v4(),

  category event_category not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  location text,

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,

  -- 행사도 신청을 받을 수 있도록 토글. 봉사는 항상 true 권장.
  signup_enabled boolean not null default false,

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_event_time_order check (ends_at >= starts_at)
);

comment on table events is '캘린더 일정. 운영진이 등록.';
comment on column events.category is 'volunteer=봉사 / event=행사 / closed=휴무';
comment on column events.signup_enabled is '회원 신청 활성화 여부. closed 카테고리는 항상 false 권장.';

create index idx_events_starts_at on events(starts_at);
create index idx_events_category_starts on events(category, starts_at);

create trigger trg_events_updated_at before update on events
  for each row execute function update_updated_at_column();

-- ============================================================================
-- event_signups
-- ============================================================================
create table event_signups (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,

  party_size integer not null default 1 check (party_size between 1 and 20),
  message text,

  -- 취소 가능: status 로 표시 (행 삭제 X — 운영 기록 보존)
  status text not null default '접수' check (status in ('접수', '취소')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(event_id, user_id)
);

comment on table event_signups is '봉사 슬롯/행사 신청. event.signup_enabled=true 일 때만.';

create index idx_event_signups_event on event_signups(event_id);
create index idx_event_signups_user on event_signups(user_id);

create trigger trg_event_signups_updated_at before update on event_signups
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS — events
-- ============================================================================
alter table events enable row level security;

-- 누구나 조회 (게스트도 캘린더 볼 수 있음)
create policy "Anyone can view events"
  on events for select
  using (true);

-- 운영진만 작성·수정·삭제
create policy "Admins manage events"
  on events for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- RLS — event_signups
-- ============================================================================
alter table event_signups enable row level security;

-- 본인 + 운영진만 조회
create policy "Users view own signups, admins view all"
  on event_signups for select
  using (user_id = auth.uid() or is_admin());

-- 본인이 자기 이름으로 신청. signup_enabled=true 인 이벤트만, 시작 전까지만.
create policy "Users insert own signup for open events"
  on event_signups for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = event_id
        and e.signup_enabled = true
        and e.starts_at > now()
    )
  );

-- 본인이 본인 신청 수정 (취소 등)
create policy "Users update own signup"
  on event_signups for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 운영진은 모든 권한
create policy "Admins manage signups"
  on event_signups for all
  using (is_admin())
  with check (is_admin());
