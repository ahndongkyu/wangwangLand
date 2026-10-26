begin;

-- 공개 안내와 담당자 알림은 동일한 설정을 사용한다. 기존 설정은 덮어쓰지 않는다.
insert into public.app_settings(key, value) values ('site_contact_settings', jsonb_build_object(
  'data', jsonb_build_object('volunteerPhone','010-3540-3156','adoptionPhone','010-5473-2827',
    'kakaoChannel','http://pf.kakao.com/_iTmxbX/chat','naverCafe','https://cafe.naver.com/wangwangland',
    'instagram','https://www.instagram.com/wangwangland_?igsh=aWIycTZwcHZsMDhj'),
  'revision',gen_random_uuid()::text,'updatedAt',now(),'updatedBy',null
)) on conflict(key) do nothing;

create or replace function public.queue_adoption_sms() returns trigger
language plpgsql security definer set search_path = public as $$
declare staff_phone text;
begin
  if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and new.status = '취소' and new.status is distinct from old.status) then
    select regexp_replace(value->'data'->>'adoptionPhone','[^0-9]','','g') into staff_phone
      from public.app_settings where key='site_contact_settings';
    if staff_phone is null or staff_phone !~ '^0[0-9]{8,10}$' then
      raise exception '입양 담당 연락처 설정을 확인해 주세요.';
    end if;
  end if;
  if TG_OP = 'INSERT' then
    insert into adoption_sms_jobs(application_id,kind,recipient_phone,applicant_name,visit_at,actor_id)
    values(new.id,'received',staff_phone,new.applicant_name,
      case when cardinality(new.visit_available_dates)>0 and new.visit_available_time is not null
        then (new.visit_available_dates[1]::date + new.visit_available_time::time) at time zone 'Asia/Seoul' end,new.created_by)
    on conflict do nothing;
  elsif new.status is distinct from old.status then
    if new.status='승인' then
      insert into adoption_sms_jobs(application_id,kind,recipient_phone,applicant_name,visit_at,actor_id)
      values(new.id,'approved',new.phone,new.applicant_name,new.confirmed_visit_at,auth.uid()) on conflict do nothing;
    elsif new.status='취소' then
      insert into adoption_sms_jobs(application_id,kind,recipient_phone,applicant_name,actor_id)
      values(new.id,'cancelled-applicant',new.phone,new.applicant_name,auth.uid()),
            (new.id,'cancelled-staff',staff_phone,new.applicant_name,auth.uid()) on conflict do nothing;
    end if;
  end if;
  return new;
end; $$;
commit;
