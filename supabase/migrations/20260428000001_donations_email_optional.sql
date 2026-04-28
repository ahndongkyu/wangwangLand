-- 후원 등록 폼에서 이메일 입력을 제거 (카카오 OAuth 회원은 auth.users 에 이미 있음).
-- 비회원도 이메일 대신 핸드폰번호만으로 등록할 수 있도록 nullable 로 변경.
-- 회원이 등록할 경우 server action 에서 auth.users.email 자동 채움.

alter table donations alter column email drop not null;
