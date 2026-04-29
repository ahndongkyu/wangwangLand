-- 후원 감사글 (도착한 후원에 대한 공개 인증 게시글).
-- donations 테이블 = 회계 기록 (전체).
-- donation_thanks = 운영진이 받은 의미있는 후원만 공개로 인증/감사글 게시.
--
-- 멱등하게: 이미 있으면 skip. 마이그레이션 재실행 안전.

create table if not exists donation_thanks (
  id uuid primary key default uuid_generate_v4(),

  title text not null check (length(trim(title)) > 0),
  content text not null,
  images text[] not null default '{}',
  thumbnail_index int not null default 0,

  donor_display_name text,
  donation_summary text,

  donation_id uuid references donations(id) on delete set null,

  published_at timestamptz,
  view_count int not null default 0,

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table donation_thanks is
  '후원 감사글 — 운영진이 받은 후원에 대한 공개 인증 게시글.';

create index if not exists idx_donation_thanks_published
  on donation_thanks(published_at desc nulls last);
create index if not exists idx_donation_thanks_donation
  on donation_thanks(donation_id) where donation_id is not null;

drop trigger if exists trg_donation_thanks_updated_at on donation_thanks;
create trigger trg_donation_thanks_updated_at before update on donation_thanks
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
alter table donation_thanks enable row level security;

drop policy if exists "Anyone can view published thanks" on donation_thanks;
create policy "Anyone can view published thanks"
  on donation_thanks for select
  using (published_at is not null);

drop policy if exists "Admins can view all thanks" on donation_thanks;
create policy "Admins can view all thanks"
  on donation_thanks for select
  using (is_admin());

drop policy if exists "Admins manage thanks" on donation_thanks;
create policy "Admins manage thanks"
  on donation_thanks for all
  using (is_admin())
  with check (is_admin());
