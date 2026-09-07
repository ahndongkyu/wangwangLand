alter table profiles
  add column if not exists favorite_menu_items text[] not null
  default array['volunteer', 'adopt', 'daily']::text[];

alter table profiles
  drop constraint if exists profiles_favorite_menu_items_valid;

alter table profiles
  add constraint profiles_favorite_menu_items_valid
  check (
    cardinality(favorite_menu_items) between 1 and 8
    and favorite_menu_items <@ array[
      'volunteer',
      'adopt',
      'daily',
      'free',
      'qna',
      'dogs',
      'calendar',
      'donate'
    ]::text[]
  );

comment on column profiles.favorite_menu_items is
  '홈 사이드바에 노출할 회원별 즐겨찾기 메뉴 키 목록';
