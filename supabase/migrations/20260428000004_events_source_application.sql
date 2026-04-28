-- 봉사 신청 승인 시 자동으로 캘린더에 일정 등록.
-- 자동 생성된 일정은 운영진 캘린더에만 표시 (visibility='internal').
-- 클릭 시 신청 상세로 이동하기 위해 source_application_* 로 역참조.

alter table events
  add column source_application_type text check (
    source_application_type in ('volunteer', 'adoption')
  ),
  add column source_application_id uuid,
  add column visibility text not null default 'public' check (
    visibility in ('public', 'internal')
  );

comment on column events.source_application_type is
  '신청 자동 생성 출처 — volunteer | adoption. null=일반 일정.';
comment on column events.source_application_id is
  '연결된 신청의 id (UUID). source_application_type 과 함께 의미를 가짐.';
comment on column events.visibility is
  'public=공개 캘린더 노출, internal=운영진만 노출.';

-- 자동 생성 이벤트 빠른 조회
create index idx_events_source on events(source_application_type, source_application_id)
  where source_application_id is not null;

create index idx_events_visibility on events(visibility, starts_at);

-- RLS — internal 이벤트는 운영진만 조회
drop policy if exists "Anyone can view events" on events;
create policy "Public events visible to all, internal only to admins"
  on events for select
  using (visibility = 'public' or is_admin());
