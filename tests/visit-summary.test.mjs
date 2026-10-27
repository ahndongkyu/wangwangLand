import test from "node:test"
import assert from "node:assert/strict"
import { load, renderCalendar } from "./helpers/page-review-fixtures.mjs"

const lib = load("src/features/events/lib/visit-summary.ts", { "./date": load("src/features/events/lib/date.ts") })
const event = (id, app = id, starts_at = "2026-10-23T15:00:00Z") => ({ id, source_application_id: app, source_application_type: "volunteer", starts_at })
test("방문 예정: KST 날짜, 변경 요청의 기존 일정, 재방문과 동일 이벤트 중복 구분", () => {
  const result = lib.summarizeVisits([event("a"),event("a"),event("b"),event("c","a","2026-10-24T15:00:00Z"),{...event("other"),source_application_type:"adoption"}, {...event("manual"),source_application_id:null}], [{id:"a",status:"승인",party_size:3},{id:"b",status:"일정변경요청",party_size:2}])
  assert.equal(result["2026-10-24"].visits,2);assert.equal(result["2026-10-24"].people,5)
  assert.equal(result["2026-10-25"].visits,1);assert.equal(result["2026-10-25"].people,3)
})
test("취소·반려·접수·누락·잘못된 인원은 확인 필요로 구분하고 합계 제외",()=>{
  const statuses=["취소","반려","접수","검토중"]
  const apps=statuses.map((status,i)=>({id:String(i),status,party_size:2}))
  apps.push({id:"bad",status:"승인",party_size:0})
  const result=lib.summarizeVisits([...apps.map(app=>event(app.id)),event("missing")],apps)["2026-10-24"]
  assert.equal(result.unknown,6);assert.equal(result.visits,0);assert.equal(result.people,0)
})
function fixture({authorized=true,fail=false}={}){
  const calls=[],logs=[]
  const api=load("src/features/events/api/visit-summary.ts",{
    "server-only":{},"../lib/visit-summary":lib,
    "@/shared/lib/auth":{requireAdmin:async()=>({ok:authorized,error:"권한 없음"})},
    "@/features/operation-logs/server":{recordOperationError:async(...args)=>logs.push(args)},
    "@/shared/lib/supabase/server":{createClient:async()=>({from:table=>({select:fields=>({in:async(key,ids)=>{
      calls.push({table,fields,key,ids});return {data:ids.map(id=>({id,status:"승인",party_size:2})),error:fail?{message:"failed"}:null}
    }})})})}
  });return {api,calls,logs}
}
test("관리자 전용 최소 필드·200개 단위 조회, 중복 신청 ID 한번 조회",async()=>{
  const {api,calls}=fixture();const events=Array.from({length:450},(_,i)=>event(String(i)))
  const result=await api.getVolunteerVisitSummary([...events,event("again","0")])
  assert.equal(calls.length,3);assert.ok(calls.every(c=>c.fields==="id,status,party_size"&&c.ids.length<=200&&c.key==="id"))
  assert.equal(result["2026-10-24"].visits,451);assert.equal(result["2026-10-24"].people,902)
  const denied=fixture({authorized:false});await assert.rejects(denied.api.getVolunteerVisitSummary(events));assert.equal(denied.calls.length,0)
  const empty=fixture();await empty.api.getVolunteerVisitSummary([]);assert.equal(empty.calls.length,0)
})
test("조회 실패는 0명으로 표시하지 않고 오류 기록",async()=>{
  const {api,logs}=fixture({fail:true});await assert.rejects(api.getVolunteerVisitSummary([event("a")]));assert.equal(logs.length,1)
  const html=renderCalendar({volunteerVisits:null});assert.match(html,/role="alert"/);assert.doesNotMatch(html,/신청 인원 <strong>0명/)
})
test("관리자 선택일만 집계 표시, 공개 캘린더는 기존 유지, 출석 조작 없음",()=>{
  const html=renderCalendar({volunteerVisits:{"2026-10-24":{visits:2,people:5,unknown:1}}})
  assert.match(html,/>2건<\/strong>/);assert.match(html,/>5명<\/strong>/);assert.match(html,/실제 참석 기록이 아닙니다/)
  assert.match(html,/정보 확인 필요 1건/);assert.doesNotMatch(html,/type="checkbox"/)
  assert.doesNotMatch(renderCalendar(),/실제 참석 기록이 아닙니다/)
})
