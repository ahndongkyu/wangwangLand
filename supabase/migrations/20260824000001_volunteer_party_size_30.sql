-- 봉사 단체 신청 인원 상한을 30명으로 확대
alter table volunteer_applications
  drop constraint if exists volunteer_applications_party_size_check;

alter table volunteer_applications
  add constraint volunteer_applications_party_size_check
  check (party_size between 1 and 30);

comment on column volunteer_applications.party_size is
  '함께 오는 인원수 (본인 포함, 1~30)';
