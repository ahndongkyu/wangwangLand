import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

function fixture({ authorized=true, error=null }={}) {
  const calls=[]
  const api=load("src/features/events/api/mutations.ts",{
    crypto:{},"next/cache":{revalidatePath(){}},
    "@/shared/lib/auth":{requireAdmin:async()=>({ok:authorized,error:"권한 없음"})},
    "@/shared/lib/supabase/server":{},
    "@/shared/lib/supabase/admin":{createAdminClient:()=>({rpc:async(name,args)=>{
      calls.push({name,args}); return {data:error?null:["event"],error}
    }})},
    "../notify":{prepareEventNotification:async eventId=>({eventId}),dispatchEventNotification:async()=>calls.push("push")},
    "../volunteer-notice":{snapshotEventVisits:async()=>[],notifyVolunteerVisitChanges:async()=>calls.push("sms")},
    "../lib/date":load("src/features/events/lib/date.ts"),"../lib/recurrence":{},"../types":{INTERNAL_CATEGORIES:[]},
  })
  const form=new FormData(); form.set("title","일정"); form.set("category","event");form.set("starts_at","2026-11-10T15:00")
  return {api,calls,form}
}
const rev=[{id:"event",updated_at:"2026-10-27T00:00:00Z"}]
test("반복 행사 등록도 신청 제한 대상을 모든 일정에 저장",async()=>{
  let saved=[]
  const api=load("src/features/events/api/mutations.ts",{
    crypto:{randomUUID:()=>"group"},"next/cache":{revalidatePath(){}},
    "@/shared/lib/supabase/admin":{},"@/shared/lib/auth":{},
    "../notify":{},"../volunteer-notice":{},
    "@/shared/lib/supabase/server":{createClient:async()=>({
      auth:{getUser:async()=>({data:{user:{id:"admin"}}})},
      from:()=>({insert:async rows=>{saved=rows;return {error:null}}}),
    })},
    "../lib/date":load("src/features/events/lib/date.ts"),
    "../lib/recurrence":{generateOccurrenceDates:()=>["2026-11-10","2026-11-17"]},
    "../types":{INTERNAL_CATEGORIES:[]},
  })
  const form=new FormData()
  for(const [key,value] of Object.entries({title:"행사",category:"event",starts_at:"2026-11-10T15:00",recurrence_mode:"weekly",application_block:"both"})) form.set(key,value)
  assert.equal((await api.createEvent(form)).count,2)
  assert.equal(saved.length,2)
  assert.ok(saved.every(row=>row.application_block==="both"))
})
test("일정 수정·삭제: 권한과 초기 버전 없이는 쓰기·알림 없음",async()=>{
  for(const authorized of [false,true]) for(const expected of [undefined,[],[{id:"event",updated_at:"bad"}],rev.concat(rev)]){
    const {api,calls,form}=fixture({authorized})
    assert.ok((await api.updateEvent("event",form,"one",expected)).error)
    assert.ok((await api.deleteEvent("event","one",expected)).error)
    assert.equal(calls.length,0)
  }
})
test("일정 충돌과 SQL 미설치 오류는 알림 없이 실패하며 무보호 쓰기로 대체하지 않음",async()=>{
  for(const message of ["EVENT_REVISION_CONFLICT","Could not find the function public.mutate_event_checked"]){
    for(const action of ["update","delete"]){
      const {api,calls,form}=fixture({error:{message}})
      const result=action==="update"?await api.updateEvent("event",form,"one",rev):await api.deleteEvent("event","one",rev)
      assert.ok(result.error)
      assert.equal(Boolean(result.conflict),message==="EVENT_REVISION_CONFLICT")
      assert.equal(calls.length,1)
      assert.equal(calls[0].name,"mutate_event_checked")
      assert.deepEqual(calls[0].args.p_expected,rev)
      assert.equal(calls[0].args.p_operation,action)
    }
  }
})
