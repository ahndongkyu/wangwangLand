-- 공개한 지출 내역은 로그인 회원이 조회할 수 있다.
create policy "Members can view public expense reports"
  on public.notices for select to authenticated
  using (board_type = 'expense' and home_visible and published_at is not null);

-- 기존 댓글 유형 notice를 재사용한다. 글을 볼 수 없는 사용자는 댓글도 접근할 수 없다.
-- restrictive 정책을 사용하여 기존 회원/작성자/운영진 정책의 권한을 확장하지 않는다.
create policy "Notice comments require visible post"
  on public.comments as restrictive for select
  using (post_type <> 'notice' or exists (
    select 1 from public.notices n where n.id = comments.post_id
  ));

create policy "Notice comment inserts require visible post"
  on public.comments as restrictive for insert
  with check (post_type <> 'notice' or exists (
    select 1 from public.notices n where n.id = comments.post_id
  ));

create policy "Notice comment updates require visible post"
  on public.comments as restrictive for update
  using (post_type <> 'notice' or exists (
    select 1 from public.notices n where n.id = comments.post_id
  ))
  with check (post_type <> 'notice' or exists (
    select 1 from public.notices n where n.id = comments.post_id
  ));

create policy "Notice comment deletes require visible post"
  on public.comments as restrictive for delete
  using (post_type <> 'notice' or exists (
    select 1 from public.notices n where n.id = comments.post_id
  ));
