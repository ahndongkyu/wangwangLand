begin;

-- 기존 접수/승인은 유지한다. 상담 승인과 실제 입양 완료를 별도로 기록한다.
alter table public.adoption_applications
  add column if not exists confirmed_visit_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists adoption_date date,
  add column if not exists actual_animal_kind text check (actual_animal_kind in ('dog','cat')),
  add column if not exists actual_animal_id uuid,
  add column if not exists actual_animal_name text,
  add column if not exists actual_adopter_name text,
  add column if not exists actual_adopter_phone text,
  add column if not exists qualification_answers jsonb;

create unique index if not exists adoption_completed_animal_unique
  on public.adoption_applications(actual_animal_kind, actual_animal_id)
  where completed_at is not null;

create table if not exists public.adoption_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications(id) on delete restrict,
  kind text not null check (kind in ('survey','application')),
  pathname text not null unique,
  filename text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 3145728),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.adoption_documents enable row level security;
-- 서류는 서비스 권한으로만 접근하며 API에서 운영진 권한을 검증한다.
revoke all on public.adoption_documents from anon, authenticated;
grant all on public.adoption_documents to service_role;

create table if not exists public.adoption_sms_jobs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications(id) on delete cascade,
  kind text not null check (kind in ('received','approved','cancelled-applicant','cancelled-staff')),
  recipient_phone text not null,
  applicant_name text not null,
  visit_at timestamptz,
  actor_id uuid references public.profiles(id) on delete set null,
  state text not null default 'pending' check (state in ('pending','dispatching','sent','failed')),
  created_at timestamptz not null default now(),
  unique(application_id, kind)
);
alter table public.adoption_sms_jobs enable row level security;
revoke all on public.adoption_sms_jobs from anon, authenticated;
grant all on public.adoption_sms_jobs to service_role;

create or replace function public.queue_adoption_sms() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    insert into adoption_sms_jobs(application_id, kind, recipient_phone, applicant_name, visit_at, actor_id)
    values(new.id,'received','01054732827',new.applicant_name,
      case when cardinality(new.visit_available_dates)>0 and new.visit_available_time is not null
        then (new.visit_available_dates[1]::date + new.visit_available_time::time) at time zone 'Asia/Seoul' end,new.created_by)
    on conflict do nothing;
  elsif new.status is distinct from old.status then
    if new.status = '승인' then
      insert into adoption_sms_jobs(application_id, kind, recipient_phone, applicant_name, visit_at, actor_id)
      values(new.id,'approved',new.phone,new.applicant_name,new.confirmed_visit_at,auth.uid()) on conflict do nothing;
    elsif new.status = '취소' then
      insert into adoption_sms_jobs(application_id, kind, recipient_phone, applicant_name, actor_id)
      values(new.id,'cancelled-applicant',new.phone,new.applicant_name,auth.uid()),
            (new.id,'cancelled-staff','01054732827',new.applicant_name,auth.uid()) on conflict do nothing;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists adoption_sms_queue on public.adoption_applications;
create trigger adoption_sms_queue after insert or update of status on public.adoption_applications
for each row execute function public.queue_adoption_sms();

create or replace function public.process_adoption_consultation(
  p_id uuid, p_expected_updated_at timestamptz, p_action text,
  p_visit_at timestamptz default null, p_reason text default null,
  p_animal_kind text default null, p_animal_id uuid default null,
  p_adoption_date date default null, p_adopter_name text default null, p_adopter_phone text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  a adoption_applications%rowtype;
  staff boolean;
  animal_name text;
  animal_status text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select exists(select 1 from profiles where id=auth.uid() and role in ('admin','staff') and status='approved' and not coalesce(is_banned,false)) into staff;
  select * into a from adoption_applications where id=p_id for update;
  if not found then raise exception '신청을 찾을 수 없습니다.'; end if;
  if not staff and (p_action <> 'cancel' or a.created_by is distinct from auth.uid()) then
    raise exception '처리 권한이 없습니다.';
  end if;
  if a.updated_at is distinct from p_expected_updated_at then raise exception '신청 내용이 변경되었습니다. 새로고침 후 다시 확인해주세요.'; end if;
  if a.completed_at is not null then raise exception '입양 완료된 신청은 변경할 수 없습니다.'; end if;
  if length(p_reason)>2000 then raise exception '사유는 2,000자 이내로 입력해주세요.'; end if;
  if length(p_adopter_name)>100 then raise exception '입양자 이름은 100자 이내로 입력해주세요.'; end if;
  if p_action = 'approve' then
    if a.status not in ('접수','검토중','승인') then raise exception '승인할 수 없는 상태입니다.'; end if;
    if a.status='승인' and a.confirmed_visit_at is not null then raise exception '이미 승인된 신청입니다.'; end if;
    if p_visit_at is null or p_visit_at <= now() then raise exception '미래의 방문 일정을 지정해주세요.'; end if;
    update adoption_applications set status='승인', confirmed_visit_at=p_visit_at, approved_at=now(),approved_by=auth.uid(),updated_at=clock_timestamp() where id=p_id;
    -- 과거 승인 기록은 일정만 보완하고 승인 문자를 재발송하지 않는다.
  elsif p_action='reject' then
    if a.status not in ('접수','검토중') then raise exception '승인대기 신청만 거절할 수 있습니다.'; end if;
    if nullif(btrim(p_reason),'') is null then raise exception '거절 사유를 입력해주세요.'; end if;
    update adoption_applications set status='반려',rejection_reason=btrim(p_reason),updated_at=clock_timestamp() where id=p_id;
  elsif p_action='cancel' then
    if a.created_by is distinct from auth.uid() then raise exception '신청자 본인만 취소할 수 있습니다.'; end if;
    if a.status not in ('접수','검토중','승인') then raise exception '취소할 수 없는 상태입니다.'; end if;
    if nullif(btrim(p_reason),'') is null then raise exception '취소 사유를 입력해주세요.'; end if;
    delete from events where source_application_type='adoption' and source_application_id=p_id;
    update adoption_applications set status='취소',cancel_reason=btrim(p_reason),updated_at=clock_timestamp() where id=p_id;
  elsif p_action='complete' then
    if a.status <> '승인' then raise exception '상담 승인 후 입양 완료 처리해주세요.'; end if;
    if p_adoption_date is null or p_adoption_date>(now() at time zone 'Asia/Seoul')::date then raise exception '실제 입양일을 확인해주세요.'; end if;
    if nullif(btrim(p_adopter_name),'') is null or p_adopter_phone is null or p_adopter_phone !~ '^01[016789][0-9]{7,8}$' then raise exception '실제 입양자 이름과 연락처를 확인해주세요.'; end if;
    if p_animal_kind='dog' then
      select name,status::text into animal_name,animal_status from dogs where id=p_animal_id for update;
    elsif p_animal_kind='cat' then
      select name,status::text into animal_name,animal_status from cats where id=p_animal_id for update;
    else raise exception '실제 입양한 아이를 선택해주세요.'; end if;
    if animal_status is null or animal_status not in ('보호중','임시보호중') then raise exception '현재 입양 완료 처리할 수 없는 아이입니다.'; end if;
    if p_animal_kind='dog' then update dogs set status='입양완료' where id=p_animal_id;
    else update cats set status='입양완료' where id=p_animal_id; end if;
    update adoption_applications set completed_at=now(),completed_by=auth.uid(),adoption_date=p_adoption_date,
      actual_animal_kind=p_animal_kind,actual_animal_id=p_animal_id,actual_animal_name=animal_name,
      actual_adopter_name=btrim(p_adopter_name),actual_adopter_phone=p_adopter_phone,updated_at=clock_timestamp() where id=p_id;
  else raise exception '지원하지 않는 처리입니다.'; end if;
end; $$;
revoke all on function public.process_adoption_consultation(uuid,timestamptz,text,timestamptz,text,text,uuid,date,text,text) from public,anon;
grant execute on function public.process_adoption_consultation(uuid,timestamptz,text,timestamptz,text,text,uuid,date,text,text) to authenticated;

-- 기존 클라이언트의 직접 상태 수정 및 이전 취소 함수 우회도 차단한다.
-- 접수는 입력·회원 검증을 거치는 서버 액션만 사용한다.
revoke insert, update on public.adoption_applications from anon, authenticated;
create or replace function public.guard_completed_adoption() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.completed_at is not null then
    if TG_OP='DELETE' then raise exception '입양 완료 기록은 삭제할 수 없습니다.'; end if;
    -- 회원 탈퇴·동물 삭제 시 외래키가 NULL로 정리되는 동작은 막지 않는다.
    if (to_jsonb(new)-array['updated_at','created_by','approved_by','completed_by','dog_id','cat_id'])
      is distinct from (to_jsonb(old)-array['updated_at','created_by','approved_by','completed_by','dog_id','cat_id']) then
      raise exception '입양 완료 기록은 변경할 수 없습니다.';
    end if;
  end if;
  if TG_OP='UPDATE' and new.status='취소' and old.status not in ('접수','검토중','승인') then raise exception '취소할 수 없는 상태입니다.'; end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists protect_completed_adoption on public.adoption_applications;
create trigger protect_completed_adoption before update or delete on public.adoption_applications
for each row execute function public.guard_completed_adoption();
notify pgrst, 'reload schema';
commit;
