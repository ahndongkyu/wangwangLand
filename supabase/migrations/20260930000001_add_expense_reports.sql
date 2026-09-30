-- 운영진 전용 지출 내역은 기존 공지 테이블을 재사용하되 공개 공지와 분리한다.
alter table public.notices
  add column board_type text not null default 'notice',
  add column attachments jsonb not null default '[]'::jsonb,
  add column home_visible boolean not null default false;

alter table public.notices
  add constraint notices_board_type_check check (board_type in ('notice', 'expense'));

comment on column public.notices.board_type is 'notice: 공개 공지, expense: 운영진 전용 지출 내역';
comment on column public.notices.attachments is '지출 내역 첨부파일 메타데이터 배열';
comment on column public.notices.home_visible is '추후 홈 화면 노출 여부';

-- 지출 내역은 발행 상태여도 일반 방문자에게 공개하지 않는다.
drop policy if exists "Anyone can view published notices" on public.notices;
create policy "Anyone can view published notices"
  on public.notices for select
  using (published_at is not null and board_type = 'notice');
