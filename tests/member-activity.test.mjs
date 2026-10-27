import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"

const categories=load("src/features/daily/lib/community-category.ts")
const make=(id,category,date="2026-10-20T00:00:00Z",owner="member")=>({id,title:`글 ${id}`,category,posted_at:date,created_at:date,created_by:owner,published_at:date})
function fixture({data,authorized=true,failTable,failCount=false}={}){
  const calls=[],logs=[]
  const rows=data??{daily_posts:[make("same","일상"),make("free","질문 및 답변"),make("review","봉사 후기"),make("donate","후원 소식"),make("other","일상",undefined,"other")],adoption_stories:[{...make("same"),published_at:null}],donation_thanks:[make("thanks")]}
  const api=load("src/features/members/api/activity.ts",{
    "server-only":{},"@/shared/lib/auth":{requireAdmin:async()=>({ok:authorized,error:"권한 없음"})},
    "@/features/daily/lib/community-category":categories,
    "@/features/operation-logs/server":{recordOperationError:async(...args)=>logs.push(args)},
    "@/shared/lib/supabase/server":{createClient:async()=>({from(table){
      const state={table,filters:[],order:[],range:null,head:false};calls.push(state)
      const q={select(fields,opts){state.fields=fields;state.head=!!opts?.head;return q},eq(col,value){state.filters.push([col,value]);return q},
        in(col,values){state.values=values;return q},or(){state.daily=true;return q},order(col,opts){state.order.push([col,opts.ascending]);return q},range(from,to){state.range=[from,to];return q},
        then(resolve){let result=(rows[table]??[]).filter(row=>state.filters.every(([col,value])=>row[col]===value));
          if(state.values)result=result.filter(row=>state.values.includes(row.category));if(state.daily)result=result.filter(row=>categories.communityType(row.category)==="일상");
          result.sort((a,b)=>{for(const [col,asc] of state.order){const diff=String(a[col]).localeCompare(String(b[col]));if(diff)return asc?diff:-diff}return 0});
          const count=result.length;if(state.range)result=result.slice(state.range[0],state.range[1]+1);
          return Promise.resolve(resolve({data:state.head?null:result,count,error:table===failTable&&state.head===failCount?{message:"query failed"}:null}))
        }};return q
    }})},
  });return {api,calls,logs}
}
test("회원 이야기: 모든 원본·유형·임시저장 통합, 다른 회원 제외, ID 충돌 보존",async()=>{
  const {api,calls}=fixture();const result=await api.listMemberActivity("member")
  assert.equal(result.total,6);assert.equal(result.posts.length,6)
  assert.equal(result.posts.filter(p=>p.id==="same").length,2)
  assert.ok(result.posts.some(p=>p.source==="story"&&p.draft&&p.href==="/admin/stories/same/edit"))
  assert.ok(result.posts.some(p=>p.source==="thanks"&&p.href==="/admin/thanks/thanks/edit"))
  assert.deepEqual(new Set(result.posts.map(p=>p.category)),new Set(["일상","자유","후기","후원"]))
  assert.ok(calls.every(c=>c.filters.some(([col,value])=>col==="created_by"&&value==="member")))
  assert.ok(calls.every(c=>!c.fields.includes("content")&&!c.fields.includes("images")))
})
test("유형 필터도 회원 범위와 전체 집계를 유지",async()=>{
  for(const [category,count] of [["일상",1],["자유",1],["후기",2],["후원",2]]){
    const {api}=fixture();const result=await api.listMemberActivity("member",{category})
    assert.equal(result.total,6);assert.equal(result.filteredTotal,count)
    assert.ok(result.posts.every(p=>p.category===category))
  }
})
test("1000건 이상의 혼합 원본 페이지에서 누락·중복 없이 안정적인 정렬",async()=>{
  const data=Object.fromEntries(["daily_posts","adoption_stories","donation_thanks"].map((table,index)=>[table,Array.from({length:450},(_,i)=>make(String(i).padStart(4,"0"),"일상",new Date(Date.UTC(2026,0,1)-(i*3+index)*1000).toISOString()))]))
  const {api,calls}=fixture({data});const result=await api.listMemberActivity("member",{page:110})
  assert.equal(result.total,1350);assert.equal(result.posts.length,10)
  assert.equal(result.posts[0].id,"0363");assert.equal(result.posts[0].source,"story")
  assert.equal(new Set(result.posts.map(p=>p.href)).size,10)
  assert.ok(calls.filter(c=>c.range).every(c=>c.range[1]-c.range[0]<200))
  const next=await api.listMemberActivity("member",{page:111});assert.ok(next.posts.every(p=>!result.posts.some(old=>old.href===p.href)))
})
test("빈 내역·잘못된 페이지·마지막 페이지 초과 정상 처리",async()=>{
  const {api}=fixture();for(const page of [NaN,Infinity,-3,1e10])assert.equal((await api.listMemberActivity("member",{page})).page,1)
  const empty=await fixture({data:{}}).api.listMemberActivity("member");assert.equal(empty.total,0);assert.equal(empty.posts.length,0)
})
test("조회 실패를 0건으로 숨기지 않고 기록, 권한 없으면 DB 미조회",async()=>{
  for(const failCount of [true,false]){const {api,logs}=fixture({failTable:"daily_posts",failCount});await assert.rejects(api.listMemberActivity("member"));assert.equal(logs.length,1)}
  const {api,calls}=fixture({authorized:false});await assert.rejects(api.listMemberActivity("member"));assert.equal(calls.length,0)
})

const uiImports={"next/link":{default:({children,...props})=>React.createElement("a",props,children)},"@/features/daily/lib/community-category":categories,
  "@/shared/lib/admin-list":load("src/shared/lib/admin-list.ts"),"@/shared/lib/utils":{cn:(...args)=>args.filter(Boolean).join(" "),formatShortDate:value=>value.slice(2,10).replaceAll("-",".")}}
const Section=load("src/features/members/components/member-activity.tsx",uiImports).MemberActivitySection
test("유형·페이지 링크는 회원 상세와 목록 복귀 경로를 보존",async()=>{
  const activity=await fixture().api.listMemberActivity("member")
  const html=renderToStaticMarkup(React.createElement(Section,{activity:{...activity,page:2,totalPages:3},memberId:"member",category:"후기",returnHref:"/admin/admins"}))
  assert.match(html,/작성한 이야기/);assert.match(html,/임시저장/);assert.match(html,/activityPage=3/);assert.match(html,/activityType=%ED%9B%84%EA%B8%B0/)
  assert.match(html,/returnTo=%2Fadmin%2Fadmins/);assert.match(html,/\/admin\/members\/member\?/)
  assert.doesNotMatch(html,/href="\/admin\/(daily|stories)"/)
  const failed=renderToStaticMarkup(React.createElement(Section,{activity:null,memberId:"member",returnHref:"/admin/members"}))
  assert.match(failed,/role="alert"/);assert.doesNotMatch(failed,/작성한 이야기가 없습니다/)
})
