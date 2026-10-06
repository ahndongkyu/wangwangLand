-- 직접 입력한 희망 아이는 실제 개체 연결과 별도로 보관한다.
alter table public.adoption_applications
  add column if not exists preferred_animal text;

comment on column public.adoption_applications.preferred_animal
  is '신청자가 직접 입력한 희망 아이 이름 또는 특징. 개체 자동 연결에 사용하지 않음.';

notify pgrst, 'reload schema';
