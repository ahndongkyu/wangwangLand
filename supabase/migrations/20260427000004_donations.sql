-- 후원 기록 테이블
-- 현재는 기부금영수증 발급 자격이 없는 단계라 후원자에게 즉시 영수증을 줄 수 없음.
-- 후원 기록을 보관하고 추후 발급 자격이 생기면 일괄 안내·발급할 수 있도록 함.

create type donation_type as enum ('cash', 'goods');
create type donation_status as enum ('pending', 'approved', 'rejected');

create table donations (
  id uuid primary key default uuid_generate_v4(),

  -- 후원자 정보 (영수증/연락용 — 어드민 전용)
  donor_name text not null,
  phone text,
  email text not null,

  -- 회원 연결 (비회원도 등록 가능 → null 허용)
  user_id uuid references auth.users(id) on delete set null,

  -- 공개 표시 옵션
  display_name text,                       -- 비우면 자동 마스킹 (홍길동 → 홍**)
  is_anonymous boolean not null default false,
  message text,                            -- 후원 메시지 (한 줄)

  -- 후원 내용
  type donation_type not null,
  amount integer check (amount is null or amount >= 0),  -- 현금(원)
  item_description text,                   -- 물품명
  item_quantity text,                      -- "5kg", "3박스" 등 자유 텍스트

  -- 후원 일자 (입금일/발송일)
  donated_at date not null,

  -- 상태
  status donation_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references admins(id) on delete set null,
  rejection_reason text,

  -- 영수증 (미래 발급 자격 생기면)
  receipt_issued boolean not null default false,
  receipt_issued_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 현금이면 amount, 물품이면 item_description 필수
  constraint chk_donation_payload check (
    (type = 'cash'  and amount is not null and amount > 0)
    or
    (type = 'goods' and item_description is not null and length(item_description) > 0)
  )
);

comment on table donations is '후원 기록. 운영진 승인 후 정식 기록으로 전환.';
comment on column donations.user_id is '회원이면 auth.users.id, 비회원이면 null';
comment on column donations.display_name is '공개 표시명 override. 비우면 donor_name 자동 마스킹';

create index idx_donations_user on donations(user_id);
create index idx_donations_status on donations(status, created_at desc);
create index idx_donations_donated_at on donations(donated_at desc);

create trigger trg_donations_updated_at before update on donations
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
alter table donations enable row level security;

-- 어드민/운영진: 모든 권한
create policy "Admins manage donations"
  on donations for all
  using (is_admin())
  with check (is_admin());

-- 본인 후원 조회 (마이페이지용)
create policy "Users view own donations"
  on donations for select
  using (user_id = auth.uid());

-- 후원 등록은 누구나 (비회원 포함). user_id 는 자기 자신 또는 null 만 허용.
create policy "Anyone insert donation"
  on donations for insert
  with check (user_id is null or user_id = auth.uid());

-- 본인이 검토중(pending) 상태에서만 취소(삭제) 가능. 승인 후엔 운영진만.
create policy "Users cancel pending own donations"
  on donations for delete
  using (user_id = auth.uid() and status = 'pending');

-- 본인은 수정 불가. 모든 update 는 위의 admin policy 만 통과.
