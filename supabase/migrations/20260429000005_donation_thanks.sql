-- 후원 감사글 (도착한 후원에 대한 공개 인증 게시글).
-- donations 테이블 = 회계 기록 (전체).
-- donation_thanks = 운영진이 받은 의미있는 후원만 공개로 인증/감사글 게시.

create table donation_thanks (
  id uuid primary key default uuid_generate_v4(),

  title text not null check (length(trim(title)) > 0),
  content text not null,
  images text[] not null default '{}',
  thumbnail_index int not null default 0,

  /** 표시용 후원자명 (마스킹된 형태 또는 익명). */
  donor_display_name text,
  /** 받은 물품/금액 요약 (예: "사료 5kg, 간식 3박스"). */
  donation_summary text,

  /** donations 테이블과 연결 (선택). 회계 기록과 1:1 매칭 가능. */
  donation_id uuid references donations(id) on delete set null,

  published_at timestamptz,
  view_count int not null default 0,

  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table donation_thanks is
  '후원 감사글 — 운영진이 받은 후원에 대한 공개 인증 게시글.';

create index idx_donation_thanks_published on donation_thanks(published_at desc nulls last);
create index idx_donation_thanks_donation on donation_thanks(donation_id) where donation_id is not null;

create trigger trg_donation_thanks_updated_at before update on donation_thanks
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
alter table donation_thanks enable row level security;

-- 발행된 글: 누구나 조회
create policy "Anyone can view published thanks"
  on donation_thanks for select
  using (published_at is not null);

-- 임시저장 포함 전체: 운영진만
create policy "Admins can view all thanks"
  on donation_thanks for select
  using (is_admin());

-- 운영진: 작성/수정/삭제
create policy "Admins manage thanks"
  on donation_thanks for all
  using (is_admin())
  with check (is_admin());
