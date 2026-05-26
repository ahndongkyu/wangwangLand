-- profiles.nickname 유니크 제약
-- 서버 액션의 중복 체크가 1차 방어선이고,
-- 이 제약은 동시 요청 등 예외 상황에 대한 최종 안전망.
alter table profiles
  add constraint profiles_nickname_unique unique (nickname);
