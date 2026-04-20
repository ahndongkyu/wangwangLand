-- ============================================================================
-- Storage: 공개 이미지 버킷 생성
-- 구조:
--   public-images/dogs/{dog_id}/*.jpg
--   public-images/daily/{post_id}/*.jpg
--   public-images/stories/{story_id}/*.jpg
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-images',
  'public-images',
  true, -- 공개 버킷 (누구나 읽기 가능)
  10485760, -- 10MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ============================================================================
-- Storage RLS 정책
-- ============================================================================

-- 누구나 읽기 가능 (public bucket)
create policy "Public can view public-images"
  on storage.objects for select
  using (bucket_id = 'public-images');

-- 운영진만 업로드 가능
create policy "Admins can upload to public-images"
  on storage.objects for insert
  with check (
    bucket_id = 'public-images'
    and is_admin()
  );

-- 운영진만 수정 가능
create policy "Admins can update public-images"
  on storage.objects for update
  using (bucket_id = 'public-images' and is_admin())
  with check (bucket_id = 'public-images' and is_admin());

-- 운영진만 삭제 가능
create policy "Admins can delete public-images"
  on storage.objects for delete
  using (bucket_id = 'public-images' and is_admin());
