-- dogs.created_by, cats.created_by FK 를 admins(id) → profiles(id) 로 변경.
-- 다른 테이블들과 통일.

-- dogs
alter table dogs drop constraint if exists dogs_created_by_fkey;
update dogs d
set created_by = a.user_id
from admins a
where d.created_by = a.id and a.user_id in (select id from profiles);
update dogs set created_by = null
  where created_by is not null and created_by not in (select id from profiles);
alter table dogs add constraint dogs_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- cats
alter table cats drop constraint if exists cats_created_by_fkey;
update cats c
set created_by = a.user_id
from admins a
where c.created_by = a.id and a.user_id in (select id from profiles);
update cats set created_by = null
  where created_by is not null and created_by not in (select id from profiles);
alter table cats add constraint cats_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;
