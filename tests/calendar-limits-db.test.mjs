import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const url=process.env.CALENDAR_LIMITS_TEST_DATABASE_URL
test("PostgreSQL: 휴무·행사 제한과 변경 요청 인원",{skip:!url},async t=>{
 const target=new URL(url);assert.ok(["localhost","127.0.0.1"].includes(target.hostname));assert.equal(target.pathname,"/calendar_limits_test")
 const sql=text=>execFileSync("psql",[url,"-X","-qAt","-v","ON_ERROR_STOP=1"],{input:text,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim()
 sql(`drop schema public cascade;create schema public;
 do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;create role authenticated;create role service_role;end if;end$$;
 grant usage on schema public to anon,authenticated,service_role;
 create type application_status as enum ('접수','검토중','승인','일정변경요청','반려','취소');
 create function is_admin() returns boolean language sql as $$select current_setting('test.admin',true)='yes'$$;
 create table volunteer_applications(id uuid primary key,applicant_name text default '신청자',group_name text,party_size int default 1,status application_status default '접수',
 available_dates date[] default '{}',available_time text,activities text[],message text,admin_note text,cancel_reason text,reschedule_dates date[],reschedule_time text,approved_by uuid,approved_at timestamptz,updated_at timestamptz default now());
 create table adoption_applications(id uuid primary key,status application_status default '접수',visit_available_dates date[] default '{}');
 create table events(id uuid primary key default gen_random_uuid(),category text,title text,description text,location text,starts_at timestamptz,ends_at timestamptz,all_day boolean default false,signup_enabled boolean default false,
 visibility text default 'public',custom_label text,custom_color text,source_application_type text,source_application_id uuid,recurrence_group_id uuid,created_by uuid,updated_at timestamptz default now());
 create unique index event_source on events(source_application_type,source_application_id,starts_at) where source_application_id is not null;
 create function touch_application() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
 create trigger touch_application before update on volunteer_applications for each row execute function touch_application();`)
 for(const file of ["20260909000001_volunteer_optional_group_name.sql","20261008000003_volunteer_processing_conflict_guard.sql","20261027000001_checked_event_mutations.sql","20261027000002_application_calendar_limits.sql"])sql(readFileSync(`supabase/migrations/${file}`,"utf8"))
 const id="00000000-0000-4000-8000-000000000001"
 const reset=()=>sql("truncate events,volunteer_applications,adoption_applications")
 const event=(category,block="none",from="2099-11-10T00:00:00+09:00",to="2099-11-11T00:00:00+09:00")=>sql(`insert into events(category,title,starts_at,ends_at,application_block) values('${category}','일정','${from}','${to}','${block}')`)
 const apply=(kind,date="2099-11-10",people=1)=>sql(kind==="volunteer"?`insert into volunteer_applications(id,party_size,available_dates) values('${id}',${people},array['${date}']::date[])`:`insert into adoption_applications(id,visit_available_dates) values('${id}',array['${date}']::date[])`)
 const process=(action="replace")=>sql(`select process_volunteer_application_checked('${id}','승인',null,null,'${action}',${action==="replace"?"array['2099-11-12T13:00:00+09:00']::timestamptz[]":"'{}'::timestamptz[]"},true,null,'일정변경요청',(select updated_at from volunteer_applications where id='${id}'))`)
 await t.test("휴무일은 두 신청 차단, 다음 날 경계는 허용",()=>{
  reset();event("closed");for(const kind of ["volunteer","adoption"])assert.throws(()=>apply(kind),/신청 제한/)
  apply("volunteer","2099-11-11");assert.equal(sql("select count(*) from volunteer_applications"),"1")
 })
 await t.test("일반 행사 기본 허용, 선택한 대상만 제한",()=>{
  for(const block of ["none","volunteer","adoption","both"]){reset();event("event",block);for(const kind of ["volunteer","adoption"]){if(block===kind||block==="both")assert.throws(()=>apply(kind),/신청 제한/);else apply(kind)}}
 })
 await t.test("여러 날 정기봉사는 중간 날짜도 5명 이상만 제한",()=>{
  reset();event("regular_volunteer","none","2099-11-09T10:00:00+09:00","2099-11-11T17:00:00+09:00");assert.throws(()=>apply("volunteer","2099-11-10",5),/정기봉사/);apply("volunteer","2099-11-10",4);apply("adoption")
 })
 await t.test("일정변경 접수는 기존 인원 유지, 승인 시 일정 제목까지 반영",()=>{
  reset();apply("volunteer");sql(`update volunteer_applications set status='승인' where id='${id}';update volunteer_applications set status='일정변경요청',reschedule_party_size=3,reschedule_dates=array['2099-11-12']::date[],reschedule_time='13:00' where id='${id}'`)
  assert.equal(sql("select party_size from volunteer_applications"),"1");process();assert.equal(sql("select party_size from volunteer_applications"),"3");assert.equal(sql("select reschedule_party_size is null from volunteer_applications"),"t");assert.match(sql("select title from events"),/외 2명/)
 })
 await t.test("변경 거절은 기존 인원 유지하고 요청값 제거",()=>{
  reset();apply("volunteer");sql(`update volunteer_applications set status='일정변경요청',reschedule_party_size=4,reschedule_dates=array['2099-11-12']::date[] where id='${id}'`);process("keep");assert.equal(sql("select party_size from volunteer_applications"),"1");assert.equal(sql("select reschedule_party_size is null from volunteer_applications"),"t")
 })
 await t.test("접수 뒤 휴무 추가: 승인 실패 시 인원·상태 전부 롤백",()=>{
  reset();apply("volunteer");sql(`update volunteer_applications set status='일정변경요청',reschedule_party_size=4,reschedule_dates=array['2099-11-12']::date[] where id='${id}'`);event("closed","none","2099-11-12T00:00+09:00","2099-11-13T00:00+09:00");assert.throws(()=>process(),/신청 제한/);assert.equal(sql("select party_size||':'||status::text from volunteer_applications"),"1:일정변경요청");assert.equal(sql("select count(*) from events where source_application_id is not null"),"0")
 })
 await t.test("이미 확정된 일정은 유지, 충돌은 관리자에게만 노출",()=>{
  reset();apply("volunteer");sql(`insert into events(category,title,starts_at,ends_at,source_application_type,source_application_id) values('volunteer','신청자','2099-11-10T13:00+09:00','2099-11-10T13:00+09:00','volunteer','${id}')`);event("closed");assert.equal(sql("select count(*) from events where source_application_id is not null"),"1");assert.throws(()=>sql("select * from application_calendar_conflicts('2099-11-01','2099-12-01')"),/관리자/);assert.match(sql("set test.admin='yes';select reason from application_calendar_conflicts('2099-11-01','2099-12-01')"),/휴무일/)
 })
 await t.test("공개 제한 조회는 개인정보 없이 범위 제한, 잘못된 인원 거부",()=>{
  assert.equal(sql("set role anon;select count(*) from application_blocked_dates('2099-11-10','2099-11-10','volunteer',1)"),"1");assert.throws(()=>sql("select * from application_blocked_dates('2099-01-01','2100-01-01','adoption',1)"),/범위/);sql("delete from events");assert.throws(()=>sql(`update volunteer_applications set status='일정변경요청',reschedule_party_size=31 where id='${id}'`),/check constraint/)
 })
})
