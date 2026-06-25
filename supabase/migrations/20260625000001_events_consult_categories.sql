-- 관리자 전용 상담 카테고리 추가: 입양/임보 상담.
-- 이 카테고리는 항상 visibility='internal' 로 저장되어 사용자에겐 보이지 않고
-- 관리자/운영진 캘린더에서만 노출된다 (RLS: visibility='public' or is_admin()).

alter type event_category add value if not exists 'adoption_consult';
