-- donations.approved_by FK를 admins(id) → profiles(id)로 변경.
-- 다른 created_by 컬럼들과 통일하고, 운영진 체크를 profiles.role 로 단일화.

alter table donations drop constraint if exists donations_approved_by_fkey;

-- admins 행이 있는 운영진은 그 user_id 로 매핑.
update donations d
set approved_by = a.user_id
from admins a
where d.approved_by = a.id
  and a.user_id in (select id from profiles);

-- 매칭 실패한 행은 NULL.
update donations
set approved_by = null
where approved_by is not null
  and approved_by not in (select id from profiles);

alter table donations add constraint donations_approved_by_fkey
  foreign key (approved_by) references profiles(id) on delete set null;
