import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import * as jsx from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"

const catalog = load("src/features/operation-logs/catalog.ts")
const diagnostics = load("src/features/operation-logs/diagnostics.ts", { "./catalog": catalog })
const id = "00000000-0000-4000-8000-000000000001"
function runtime(file, imports, extra = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports, Date, URL, crypto, AbortSignal, setTimeout, clearTimeout, console:{warn(){}},process:{env:{}},...extra,require(name){assert.ok(name in imports,name);return imports[name]}})
  return exports
}
test("page/target/action and diagnostics never persist arbitrary input or full stacks", () => {
  const safe = diagnostics.safeContext({page:"/admin/applications/adoption/secret-person?phone=01012345678",targetType:"adoption",targetId:id,action:"approve"})
  assert.equal(safe.page,"/admin/applications/adoption/[detail]")
  assert.equal(safe.target_id,id)
  assert.equal(diagnostics.safeContext({targetType:"token",targetId:"secret",action:"private message"}).action,null)
  const result = diagnostics.diagnostic({name:"TypeError",message:"phone=01012345678",stack:"TypeError: token=secret\n at fn (/Users/private/project/.next/server/chunks/abc.js:12:3)"},"upload")
  assert.equal(result.location,"abc.js:12:3")
  assert.doesNotMatch(JSON.stringify(result),/private|secret|01012345678/)
  assert.equal(diagnostics.diagnostic({name:"BlobAccessError"},"upload").code,"Access")
  assert.match(diagnostics.diagnostic({},"privateStorageConfiguration").description,/BLOB_PRIVATE_READ_WRITE_TOKEN/)
  assert.equal(diagnostics.targetHref("adoption",id),`/admin/applications/adoption/${id}`)
  assert.equal(diagnostics.targetHref("expense",id),`/admin/expenses/${id}/edit`)
  assert.equal(diagnostics.targetHref("expense","https://evil.test"),null)
})
test("logger attaches verified actor and bounded metadata, with safe migration fallback", async () => {
  for (const missing of [false,true]) {
    const calls=[]
    const api=runtime("src/features/operation-logs/server.ts",{
      "server-only":{},"./catalog":catalog,"./diagnostics":diagnostics,
      "./request-context":{requestLogContext:async()=>({actor_id:id,page:"/my",browser:"Safari",device:"mobile",actor_state:"unknown"})},
      "@/shared/lib/supabase/admin":{createAdminClient:()=>({rpc(name,value){calls.push({name,value});return {abortSignal:async()=>({error:missing && name.endsWith("_event")?{code:"PGRST202"}:null})}}})},
    },{process:{env:{VERCEL_GIT_COMMIT_SHA:"a".repeat(40)}}})
    await api.recordOperationError("application","processAdoption",{code:"23514",message:"private"},"application",{targetType:"adoption",targetId:id,action:"approve"})
    assert.equal(calls[0].value.p_context.actor_id,id)
    assert.equal(calls[0].value.p_context.release,"a".repeat(40))
    assert.equal(calls[0].value.p_context.target_id,id)
    assert.equal(calls.length,missing?2:1)
    assert.doesNotMatch(JSON.stringify(calls),/private/)
  }
})
test("request identity comes from verified auth, not request headers or supplied actor", async () => {
  for(const failed of [false,true]) {
    const api=runtime("src/features/operation-logs/request-context.ts",{
      "server-only":{},"./diagnostics":diagnostics,
      "next/headers":{headers:async()=>new Map([["host","example.test"],["referer","https://example.test/admin/adoption/private?token=secret"],["user-agent","Mozilla iPhone Safari/1"],["x-user-id","forged"]])},
      "@/shared/lib/supabase/server":{createClient:async()=>({auth:{getUser:async()=>({data:{user:failed?null:{id}},error:failed?{name:"NetworkError"}:null})}})},
    })
    const r=await api.requestLogContext()
    assert.equal(r.actor_id,failed?null:id)
    assert.equal(r.page,"/admin/adoption/[detail]")
    assert.equal(r.device,"mobile")
    assert.doesNotMatch(JSON.stringify(r),/forged|secret|private/)
  }
})
test("individual history enforces top admin, filters group and pages, shows storage failure", async () => {
  for(const mode of ["forbidden","invalid","failure","success"]) {
    const calls=[]
    const rows=Array.from({length:11},(_,i)=>({id:String(i),actor_id:id,actor_role:"admin"}))
    const q={then(resolve){resolve({data:rows,error:mode==="failure"?{}:null})}}
    for(const key of ["select","eq","gte","order","range"])q[key]=(...args)=>{calls.push([key,...args]);return q}
    const api=load("src/features/operation-logs/event-actions.ts",{
      "./diagnostics":diagnostics,
      "@/shared/lib/auth":{requireTopAdmin:async()=>({ok:mode!=="forbidden",error:"권한 없음"})},
      "@/shared/lib/supabase/admin":{createAdminClient:()=>({from:table=>table==="profiles"?{select:()=>({in:async()=>({data:[{id,nickname:"테스트 관리자"}]})})}:q})},
    })
    const r=await api.getErrorEvents(mode==="invalid"?"bad":id,2)
    if(["invalid","forbidden"].includes(mode))assert.equal(calls.length,0)
    else assert.ok(calls.some(c=>c[0]==="eq"&&c[1]==="log_id"&&c[2]===id))
    if(mode==="success"){assert.equal(r.events.length,10);assert.equal(r.hasMore,true);assert.equal(r.events[0].nickname,"테스트 관리자");assert.ok(calls.some(c=>c[0]==="range"&&c[1]===10&&c[2]===20))}
    else assert.ok(r.error)
  }
})
test("event disclosure renders actor, page, target link and trace with wrapped responsive layout", () => {
  let slot=0
  const event={id,occurred_at:"2026-10-15T08:00:00Z",actor_id:id,actor_role:"admin",nickname:"테스트 관리자",page:"/admin/applications/adoption/[detail]",action:"upload",description:"저장소 접근 거부",target_type:"adoption",target_id:id,source:"server",device:"mobile",browser:"Safari",location:"abc.js:12:3",release:"a".repeat(40),trace_id:id}
  const api=runtime("src/features/operation-logs/event-history.tsx",{
    react:{useState:()=>[slot++===0?{events:[event],hasMore:false}:slot===2?1:false,()=>{}]},"react/jsx-runtime":jsx,
    "next/link":{default:({children,...props})=>React.createElement("a",props,children)},"./event-actions":{},"./diagnostics":diagnostics,
    "@/shared/lib/utils":{formatShortDateTime:v=>v},
  })
  const html=renderToStaticMarkup(React.createElement(api.EventHistory,{logId:id}))
  assert.match(html,/테스트 관리자/);assert.match(html,/업로드/);assert.match(html,/추적번호/)
  assert.match(html,/minmax\(0,1fr\)/);assert.match(html,/aria-live="polite"/)
  assert.match(html,new RegExp(`/admin/applications/adoption/${id}`))
})
