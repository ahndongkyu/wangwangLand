-- 봉사 신청 폼에서 이메일 입력을 받지 않으므로 nullable 로 변경.
-- 카카오 OAuth 회원은 server action 에서 auth.users.email 자동 저장.

alter table volunteer_applications alter column email drop not null;
