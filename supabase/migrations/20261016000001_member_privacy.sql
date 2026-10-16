begin;

-- 과거 admins 등록 여부가 아니라 현재 승인·차단·역할을 기준으로 판단한다.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=auth.uid()
  and role in ('admin','staff') and status='approved' and is_banned=false) $$;
create or replace function public.is_top_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id=auth.uid()
  and role='admin' and status='approved' and is_banned=false) $$;

alter table public.profiles enable row level security;
-- 기존의 넓은 허용 정책이 있어도 개인정보는 본인과 유효한 운영진에게만 제공한다.
drop policy if exists privacy_profiles_read on public.profiles;
create policy privacy_profiles_read on public.profiles as restrictive for select
  to anon, authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists privacy_profiles_read_allow on public.profiles;
create policy privacy_profiles_read_allow on public.profiles for select
  to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists privacy_profiles_update on public.profiles;
create policy privacy_profiles_update on public.profiles as restrictive for update
  to anon, authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists privacy_profiles_insert on public.profiles;
create policy privacy_profiles_insert on public.profiles as restrictive for insert
  to anon, authenticated with check (id=auth.uid() and role::text='member' and status::text='pending' and is_banned=false);
drop policy if exists privacy_profiles_delete on public.profiles;
create policy privacy_profiles_delete on public.profiles as restrictive for delete
  to anon, authenticated using (false);

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql set search_path=public as $$
declare allowed text[] := array['nickname','avatar_url','phone','updated_at',
  'terms_agreed_at','terms_version','privacy_agreed_at','privacy_version','marketing_agreed_at',
  'notices_last_seen_at','daily_last_seen_at','stories_last_seen_at','favorite_menu_items'];
begin
  if current_user in ('anon','authenticated') then
    if (to_jsonb(new)-allowed) is distinct from (to_jsonb(old)-allowed) then
      raise exception 'Protected profile fields cannot be changed' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- 공개 작성자 표시는 전화번호·동의기록 없이 이 투영만 사용한다.
create or replace view public.public_profile_cards with (security_barrier=true) as
  select id,nickname,role,avatar_url from public.profiles;
revoke all on public.public_profile_cards from public,anon,authenticated;
grant select on public.public_profile_cards to anon,authenticated,service_role;

-- 승인된 본인 또는 운영진만 자동 봉사 일정 원문을 읽을 수 있다.
create or replace function public.can_read_application_event(p_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists (
    select 1 from public.volunteer_applications a join public.profiles p on p.id=a.created_by
    where a.id=p_id and p.id=auth.uid() and p.status='approved' and p.is_banned=false
  )
$$;
drop policy if exists privacy_application_events on public.events;
create policy privacy_application_events on public.events as restrictive for select to anon,authenticated
  using (public.is_admin() or (visibility='public' and
    ((source_application_id is null and source_application_type is null) or (source_application_type='volunteer' and public.can_read_application_event(source_application_id)))));

-- 원문 테이블과 별도로 안전한 공개 응답을 생성한다. 신규 컬럼은 자동 공개하지 않는다.
create or replace function public.list_calendar_events_safe()
returns table (
  id uuid, category public.event_category, title text, description text, location text,
  starts_at timestamptz, ends_at timestamptz, all_day boolean, signup_enabled boolean,
  visibility text, custom_label text, custom_color text, source_application_type text,
  source_application_id uuid, recurrence_group_id uuid, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path=public as $$
  select e.id,e.category,
    case when (e.source_application_id is not null or e.source_application_type is not null) and not access.allowed
      then '봉사 ' || coalesce(a.party_size,1)::text || '명' else e.title end,
    case when access.allowed or (e.source_application_id is null and e.source_application_type is null) then e.description end,
    case when access.allowed or (e.source_application_id is null and e.source_application_type is null) then e.location end,
    e.starts_at,e.ends_at,e.all_day,e.signup_enabled,e.visibility,
    case when access.allowed or (e.source_application_id is null and e.source_application_type is null) then e.custom_label end,
    e.custom_color,
    case when access.allowed then e.source_application_type end,
    case when access.allowed then e.source_application_id end,
    case when access.allowed then e.recurrence_group_id end,
    case when access.allowed then e.created_by end,
    e.created_at,e.updated_at
  from public.events e
  left join public.volunteer_applications a on e.source_application_type='volunteer' and a.id=e.source_application_id
  cross join lateral (select coalesce(public.is_admin() or (e.source_application_type='volunteer' and public.can_read_application_event(e.source_application_id)),false) as allowed) access
  where public.is_admin() or (e.visibility='public' and (e.source_application_type is distinct from 'adoption'))
$$;
revoke all on function public.list_calendar_events_safe() from public;
grant execute on function public.list_calendar_events_safe() to anon,authenticated,service_role;
revoke all on function public.can_read_application_event(uuid) from public;
grant execute on function public.can_read_application_event(uuid) to anon,authenticated,service_role;

notify pgrst, 'reload schema';
commit;
