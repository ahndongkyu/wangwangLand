-- ============================================================================
-- 왕왕랜드 초기 스키마
-- 생성일: 2026-04-20
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUM 타입 정의
-- ============================================================================

create type dog_status as enum (
  '보호중',
  '임시보호중',
  '입양완료',
  '무지개다리'
);

create type dog_gender as enum ('수컷', '암컷', '미상');

create type application_status as enum (
  '접수',
  '검토중',
  '승인',
  '반려'
);

create type admin_role as enum ('admin', 'editor');

create type volunteer_activity as enum (
  '산책',
  '목욕·미용',
  '청소·정리',
  '홍보·촬영'
);

create type housing_type as enum (
  '아파트',
  '주택',
  '빌라',
  '오피스텔',
  '기타'
);

create type ownership_type as enum ('자가', '전세', '월세');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 운영진 (Supabase Auth 연동)
create table admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  email text not null,
  name text not null,
  role admin_role not null default 'editor',
  created_at timestamptz not null default now()
);

comment on table admins is '운영진 계정. Supabase auth.users와 1:1 연결';

-- 유기견
create table dogs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  breed text,
  gender dog_gender default '미상',
  age_months integer check (age_months >= 0), -- 월령
  weight_kg numeric(4,1) check (weight_kg >= 0),
  rescue_date date,
  status dog_status not null default '보호중',
  description text,
  personality text,
  health_info text,
  images text[] not null default '{}',
  thumbnail_index integer not null default 0 check (thumbnail_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references admins(id) on delete set null
);

comment on table dogs is '보호 중인 유기견 정보';
comment on column dogs.age_months is '월령 (예: 2년 = 24)';
comment on column dogs.images is 'Supabase Storage public URL 배열';
comment on column dogs.thumbnail_index is 'images 배열에서 대표 사진 인덱스';

-- 공지사항
create table notices (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  is_pinned boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references admins(id) on delete set null
);

comment on column notices.content is 'Markdown 형식';
comment on column notices.published_at is 'null이면 미공개 (draft)';

-- 일상 사진 갤러리
create table daily_posts (
  id uuid primary key default uuid_generate_v4(),
  caption text,
  images text[] not null default '{}',
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references admins(id) on delete set null,
  check (array_length(images, 1) > 0)
);

comment on table daily_posts is '왕왕랜드 일상 사진 피드';

-- 입양 후기
create table adoption_stories (
  id uuid primary key default uuid_generate_v4(),
  dog_id uuid references dogs(id) on delete set null,
  title text not null,
  content text not null,
  images text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references admins(id) on delete set null
);

comment on table adoption_stories is '입양 완료된 아이들의 후기';
comment on column adoption_stories.content is 'Markdown 형식';

-- 입양 신청
create table adoption_applications (
  id uuid primary key default uuid_generate_v4(),
  dog_id uuid references dogs(id) on delete set null,

  -- 기본 정보
  applicant_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  reason text not null,

  -- 가족/주거 정보
  family_size integer check (family_size > 0),
  has_children boolean,
  housing_type housing_type,
  ownership_type ownership_type,

  -- 반려 경험
  current_pets text,
  past_pet_experience text,

  -- 개인정보 동의
  privacy_agreed boolean not null default false,

  -- 메타
  status application_status not null default '접수',
  admin_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table adoption_applications is '입양 신청서. 비회원도 제출 가능';

-- 봉사 신청
create table volunteer_applications (
  id uuid primary key default uuid_generate_v4(),
  applicant_name text not null,
  phone text not null,
  email text not null,
  available_days text[] not null default '{}',
  available_time text,
  activities volunteer_activity[] not null default '{}',
  message text,
  privacy_agreed boolean not null default false,
  status application_status not null default '접수',
  admin_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table volunteer_applications is '봉사 신청서. 비회원도 제출 가능';
comment on column volunteer_applications.available_days is '가능 요일 예: {월,화,수}';

-- ============================================================================
-- TRIGGERS: updated_at 자동 갱신
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_dogs_updated_at before update on dogs
  for each row execute function update_updated_at_column();
create trigger trg_notices_updated_at before update on notices
  for each row execute function update_updated_at_column();
create trigger trg_adoption_stories_updated_at before update on adoption_stories
  for each row execute function update_updated_at_column();
create trigger trg_adoption_applications_updated_at before update on adoption_applications
  for each row execute function update_updated_at_column();
create trigger trg_volunteer_applications_updated_at before update on volunteer_applications
  for each row execute function update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_dogs_status on dogs(status);
create index idx_dogs_created_at on dogs(created_at desc);
create index idx_notices_pinned_published on notices(is_pinned desc, published_at desc nulls last);
create index idx_notices_published on notices(published_at desc nulls last);
create index idx_daily_posts_posted_at on daily_posts(posted_at desc);
create index idx_adoption_stories_published on adoption_stories(published_at desc nulls last);
create index idx_adoption_applications_status on adoption_applications(status, submitted_at desc);
create index idx_adoption_applications_dog on adoption_applications(dog_id);
create index idx_volunteer_applications_status on volunteer_applications(status, submitted_at desc);
create index idx_admins_user_id on admins(user_id);
