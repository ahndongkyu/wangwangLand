-- ============================================================================
-- 봉사 신청서 개편 (idempotent)
-- - email 필수 해제 (선택 항목)
-- - party_size 신설: 함께 오시는 인원수
-- ============================================================================

-- 1) email nullable 전환
alter table volunteer_applications
  alter column email drop not null;

-- 2) party_size 컬럼 추가 + 기본값 세팅
alter table volunteer_applications
  add column if not exists party_size int;

update volunteer_applications
   set party_size = 1
 where party_size is null;

alter table volunteer_applications
  alter column party_size set not null;

alter table volunteer_applications
  alter column party_size set default 1;

-- 3) 1~20 체크 제약 (중복 방지)
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'volunteer_applications_party_size_check'
  ) then
    alter table volunteer_applications
      add constraint volunteer_applications_party_size_check
      check (party_size between 1 and 20);
  end if;
end$$;

comment on column volunteer_applications.email is '이메일 (선택)';
comment on column volunteer_applications.party_size is '함께 오는 인원수 (본인 포함, 1~20)';
