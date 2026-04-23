-- notices 테이블에 images 컬럼 추가
alter table notices
  add column if not exists images text[] not null default '{}';

comment on column notices.images is '공지에 첨부된 이미지 URL 목록';
