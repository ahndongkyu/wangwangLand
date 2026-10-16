begin;
insert into profiles(id,nickname,phone,role,status,is_banned) values
 ('00000000-0000-4000-8000-000000000001','owner','private-phone','member','approved',false),
 ('00000000-0000-4000-8000-000000000002','other','private-phone','member','approved',false),
 ('00000000-0000-4000-8000-000000000003','staff','private-phone','staff','approved',false),
 ('00000000-0000-4000-8000-000000000004','banned','private-phone','admin','approved',true),
 ('00000000-0000-4000-8000-000000000005','admin','private-phone','admin','approved',false);
insert into volunteer_applications values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',3);
insert into events(id,category,title,description,location,visibility,source_application_type,source_application_id,created_by,starts_at,ends_at) values
 ('20000000-0000-4000-8000-000000000001','volunteer','private-name','private-message','private-location','public','volunteer','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',now(),now()),
 ('20000000-0000-4000-8000-000000000002','adoption_consult','private-consult',null,null,'internal','adoption','10000000-0000-4000-8000-000000000002',null,now(),now()),
 ('20000000-0000-4000-8000-000000000003','event','public-event','public-text',null,'public',null,null,null,now(),now());
set local role anon;
do $$ begin
 if (select count(*) from profiles)<>0 then raise exception 'guest profiles leaked'; end if;
 if (select count(*) from events)<>1 then raise exception 'raw event data leaked'; end if;
 if (select count(*) from public_profile_cards)<>5 then raise exception 'public authors broken'; end if;
 if exists(select 1 from list_calendar_events_safe() where title like 'private%' or description like 'private%' or source_application_id is not null or created_by is not null) then raise exception 'public projection leaked'; end if;
 if not exists(select 1 from list_calendar_events_safe() where title='봉사 3명') then raise exception 'public attendance missing'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from profiles)<>1 then raise exception 'other profiles leaked'; end if;
 if exists(select 1 from list_calendar_events_safe() where title='private-name') then raise exception 'nonowner leaked'; end if;
 begin
  update profiles set role='admin' where id=auth.uid();
  raise exception 'role escalation allowed';
 exception when insufficient_privilege then null; end;
 begin
  update profiles set status='approved',is_banned=true where id=auth.uid();
  raise exception 'protected state allowed';
 exception when insufficient_privilege then null; end;
 update profiles set nickname='changed' where id=auth.uid();
 if not exists(select 1 from profiles where nickname='changed') then raise exception 'own nickname broken'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if not exists(select 1 from list_calendar_events_safe() where title='private-name' and description='private-message') then raise exception 'owner access broken'; end if;
 if (select count(*) from events)<>2 then raise exception 'owner raw access wrong'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
 if not is_admin() then raise exception 'staff blocked'; end if;
 if (select count(*) from profiles)<>5 or (select count(*) from list_calendar_events_safe())<>3 then raise exception 'staff access broken'; end if;
 if is_top_admin() then raise exception 'staff elevated'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$ begin
 if is_admin() or is_top_admin() then raise exception 'banned elevated'; end if;
 if (select count(*) from profiles)<>1 then raise exception 'banned profiles leaked'; end if;
 if exists(select 1 from list_calendar_events_safe() where title like 'private%') then raise exception 'banned event leak'; end if;
end $$;
set local role service_role;
insert into privacy_access_logs(actor_id,resource,target_id,action) values('00000000-0000-4000-8000-000000000005','member','00000000-0000-4000-8000-000000000001','read');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from privacy_access_logs)<>0 then raise exception 'audit leaked'; end if;
 begin
  insert into privacy_access_logs(resource,target_id,action) values('member',auth.uid(),'read');
  raise exception 'audit forgery allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$ begin
 if (select count(*) from privacy_access_logs)<>1 then raise exception 'admin audit inaccessible'; end if;
end $$;
reset role;
insert into events(id,category,title,description,visibility,source_application_type,source_application_id,starts_at,ends_at) values
 ('20000000-0000-4000-8000-000000000004','volunteer','private-orphan','private-orphan-note','public','volunteer',null,now(),now()),
 ('20000000-0000-4000-8000-000000000005','volunteer','private-legacy','private-legacy-note','public',null,'10000000-0000-4000-8000-000000000001',now(),now());
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from events where title like 'private%') then raise exception 'orphan raw event leaked'; end if;
 if exists(select 1 from list_calendar_events_safe() where title like 'private%' or description like 'private%') then raise exception 'orphan projection leaked'; end if;
end $$;
rollback;
