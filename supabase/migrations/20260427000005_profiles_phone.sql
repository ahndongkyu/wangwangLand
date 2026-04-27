-- profiles 테이블에 핸드폰번호 컬럼 추가
-- 어드민 회원 관리에서 연락처 확인 + 마이페이지에서 본인이 입력/수정

alter table profiles add column if not exists phone text;
comment on column profiles.phone is '연락처 (선택). 마이페이지에서 본인 입력, 어드민 회원 관리에서 조회용';
