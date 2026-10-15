import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

function load(file, imports, env = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
  new Function("exports","require","process",code)(exports,name=>{
    if(name==="server-only")return {}
    if(!(name in imports))throw Error(`Missing dependency ${name}`)
    return imports[name]
  },{env,cwd:()=>process.cwd()})
  return exports
}
const logger = {recordOperationError:async()=>{}}

test("private adoption access rejects guests/restricted profiles before privileged reads and scopes members to ownership",async()=>{
  for(const kind of ["guest","banned","pending","member","staff"]){
    const filters=[];let reads=0
    const query={select(){return this},eq(k,v){filters.push([k,v]);return this},maybeSingle:async()=>({data:{id:"application"},error:null})}
    const api=load("src/features/applications/api/adoption-access.ts",{
      "@/shared/lib/supabase/server":{createClient:async()=>({auth:{getUser:async()=>({data:{user:kind==="guest"?null:{id:"owner"}}})},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{role:kind==="staff"?"staff":"member",status:kind==="pending"?"pending":"approved",is_banned:kind==="banned"}})})})},
      "@/shared/lib/supabase/admin":{createAdminClient:()=>{reads++;return{from:()=>query}}},
    })
    const result=await api.getAccessibleAdoption("application")
    if(["guest","banned","pending"].includes(kind)){assert.equal(result,null);assert.equal(reads,0)}
    else {assert.ok(result);assert.equal(filters.some(([k,v])=>k==="created_by"&&v==="owner"),kind==="member")}
  }
})

test("PDF download denies nonowners and unapproved visits; approved output is a private attachment",async()=>{
  for(const kind of ["forbidden","pending","legacy","approved"]){
    let generated=0
    const api=load("src/app/api/adoption/[id]/documents/route.ts",{
      "node:fs/promises":{readFile:async()=>new Uint8Array()},"node:path":{join:(...v)=>v.join("/")},
      "@/features/applications/api/adoption-access":{getAccessibleAdoption:async()=>kind==="forbidden"?null:{application:{status:kind==="pending"?"접수":"승인",confirmed_visit_at:kind==="legacy"?null:"2026-10-15"}}},
      "@/features/applications/lib/adoption-pdf":{generateAdoptionPdf:async()=>{generated++;return new Uint8Array([37,80,68,70])}},
      "@/features/operation-logs/server":logger,
    })
    const response=await api.GET(new Request("https://example.test"),{params:Promise.resolve({id:"application"})})
    assert.equal(response.status,kind==="forbidden"?403:kind==="approved"?200:409)
    assert.equal(generated,kind==="approved"?1:0)
    assert.equal(response.headers.get("cache-control"),"private, no-store")
    if(kind==="approved")assert.match(response.headers.get("content-disposition"),/^attachment/)
  }
})

test("document upload refuses cross-origin, ordinary members, oversized and disguised files; cleans up failed DB writes",async()=>{
  for(const kind of ["cross-origin","member","oversized","disguised","db-failure","success"]){
    const writes=[]
    const api=load("src/app/api/admin/adoption-documents/route.ts",{
      "@vercel/blob":{put:async(...args)=>{writes.push("blob");assert.equal(args[2].access,"private");return{pathname:"private-file"}},del:async()=>writes.push("cleanup")},
      "@/shared/lib/auth":{requireAdmin:async()=>({ok:kind!=="member",userId:"staff",error:"권한 없음"})},
      "@/shared/lib/supabase/admin":{createAdminClient:()=>({from:table=>table==="adoption_applications"?{select(){return this},eq(){return this},maybeSingle:async()=>({data:{id:"application"}})}:{insert:async value=>{writes.push("db");assert.equal(value.kind,"survey");return{error:kind==="db-failure"?{}:null}}}})},
      "@/features/operation-logs/server":logger,
    },{BLOB_PRIVATE_READ_WRITE_TOKEN:"test-only"})
    const data=new FormData();data.set("application_id","application");data.set("kind","survey")
    data.set("file",new File([kind==="disguised"?"<html>bad</html>":"%PDF-1.7 sample"],"form.pdf",{type:"application/pdf"}))
    const response=await api.POST(new Request("https://example.test/api/admin/adoption-documents",{method:"POST",headers:{origin:kind==="cross-origin"?"https://other.test":"https://example.test",...(kind==="oversized"?{"content-length":"5000000"}:{})},body:data}))
    assert.equal(response.status,{"cross-origin":403,member:403,oversized:413,disguised:400,"db-failure":500,success:200}[kind])
    assert.deepEqual(writes,kind==="success"?["blob","db"]:kind==="db-failure"?["blob","db","cleanup"]:[])
  }
})

test("SMS dispatch claims each pending job once and retains a saved-success warning when sending fails",async()=>{
  for(const failed of [false,true]){
    const job={id:"job",state:"pending",kind:"approved",applicant_name:"홍길동",recipient_phone:"01000000000",actor_id:"staff"}
    let sends=0
    const api=load("src/features/applications/api/adoption-notifications.ts",{
      "@/shared/lib/supabase/admin":{createAdminClient:()=>({from:()=>({update(value){this.value=value;return this},eq(key){if(key==="id")job.state=this.value.state;return this},select:async()=>{if(job.state!=="pending")return{data:[],error:null};job.state="dispatching";return{data:[job],error:null}}})})},
      "@/features/operation-logs/server":logger,
      "@/features/sms":{sendRecordedApplicationSms:async()=>{sends++;return{ok:!failed}}},
      "../lib/adoption-workflow":{buildAdoptionSms:()=>"test",adoptionSmsType:()=>"SMS"},
    })
    const warnings=await Promise.all([api.dispatchAdoptionSms("application"),api.dispatchAdoptionSms("application")])
    assert.equal(sends,1);assert.equal(job.state,failed?"failed":"sent")
    assert.equal(warnings.some(Boolean),failed)
  }
})

test("processing rejects unauthorized, invalid actions, missing versions and impossible dates before RPC",async()=>{
  for(const kind of ["forbidden","action","version","date"]){
    let called=false
    const api=load("src/features/applications/api/adoption-workflow.ts",{
      "next/cache":{},"@/shared/lib/auth":{requireAdmin:async()=>({ok:kind!=="forbidden",error:"권한 없음"})},
      "@/shared/lib/supabase/server":{createClient:async()=>{called=true;throw Error("must not reach DB")}},
      "@/shared/lib/supabase/admin":{},"@/features/operation-logs/server":logger,"./adoption-notifications":{},
    })
    const form=new FormData();form.set("action",kind==="action"?"arbitrary":"approve")
    if(kind!=="version")form.set("expected_updated_at","2026-10-15T00:00:00Z")
    form.set("visit_date","2026-02-30");form.set("visit_time","14:30")
    assert.ok((await api.processAdoption("application",form)).error);assert.equal(called,false)
  }
})
