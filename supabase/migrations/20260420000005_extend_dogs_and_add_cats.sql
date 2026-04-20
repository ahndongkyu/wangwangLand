-- ============================================================================
-- dogs 확장 + cats 테이블 신설
-- - dogs: 크기(6단계) / 견사 위치 / 중성화 여부 추가
-- - cats: 강아지와 동일한 구조, 단 크기 없음
-- - adoption_applications: 고양이 입양 신청도 가능하도록 cat_id 추가
-- ============================================================================

-- ---- 1. dogs 확장 ----

create type dog_size as enum ('소', '중소', '중', '중대', '대', '대대');

alter table dogs
  add column size dog_size,
  add column kennel_location text,
  add column neutered boolean;

create index idx_dogs_size on dogs(size);

comment on column dogs.size is '크기 (소/중소/중/중대/대/대대)';
comment on column dogs.kennel_location is '보호 위치 (견사1, 딸기밭1, 컨테이너 등) — 어드민 전용';
comment on column dogs.neutered is '중성화 여부';

-- ---- 2. cats 테이블 신설 ----

create table cats (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  breed text,
  gender dog_gender not null default '미상',
  age_months integer check (age_months >= 0),
  weight_kg numeric(4,1) check (weight_kg >= 0),
  rescue_date date,
  status dog_status not null default '보호중',
  description text,
  personality text,
  health_info text,
  kennel_location text,
  neutered boolean,
  images text[] not null default '{}',
  thumbnail_index integer not null default 0 check (thumbnail_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references admins(id) on delete set null
);

comment on table cats is '보호 중인 고양이';

-- updated_at 자동 갱신
create trigger trg_cats_updated_at
  before update on cats
  for each row execute function update_updated_at_column();

-- 인덱스
create index idx_cats_status on cats(status);
create index idx_cats_created_at on cats(created_at desc);

-- RLS
alter table cats enable row level security;

create policy "Anyone can view cats"
  on cats for select
  using (true);

create policy "Admins can manage cats"
  on cats for all
  using (is_admin())
  with check (is_admin());

-- ---- 3. adoption_applications: 고양이 입양 신청 지원 ----

alter table adoption_applications
  add column cat_id uuid references cats(id) on delete set null;

create index idx_adoption_applications_cat on adoption_applications(cat_id);

comment on column adoption_applications.dog_id is '강아지 입양 신청 시 대상 id';
comment on column adoption_applications.cat_id is '고양이 입양 신청 시 대상 id';
