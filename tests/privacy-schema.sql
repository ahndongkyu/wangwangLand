-- 전용 로컬 테스트 DB에만 적용한다.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to anon,authenticated,service_role;
create table profiles(id uuid primary key, nickname text, avatar_url text, phone text,role text,status text,is_banned boolean,updated_at timestamptz);
create type event_category as enum ('volunteer','event','adoption_consult');
create table volunteer_applications(id uuid primary key,created_by uuid,party_size int);
create table events(id uuid,category event_category,title text,description text,location text,starts_at timestamptz,ends_at timestamptz,all_day boolean,signup_enabled boolean,visibility text,custom_label text,custom_color text,source_application_type text,source_application_id uuid,recurrence_group_id uuid,created_by uuid,created_at timestamptz,updated_at timestamptz);
alter table profiles enable row level security;
alter table events enable row level security;
create policy existing_wide_profiles on profiles for all using(true) with check(true);
create policy existing_wide_events on events for all using(true) with check(true);
grant all on profiles,events,volunteer_applications to anon,authenticated,service_role;
