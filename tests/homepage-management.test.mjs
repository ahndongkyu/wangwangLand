import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsxRuntime from "react/jsx-runtime"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  vm.runInNewContext(code,{exports,URL,console,require(name){assert.ok(name in imports,name);return imports[name]}})
  return exports
}
const model = load("src/features/settings/lib/homepage.ts")
test("site photos allow only defaults or managed uploads and valid positions",()=>{
  assert.equal(model.validPhoto(model.DEFAULT_PHOTOS.banner,"banner"),true)
  const photo={src:"https://example.public.blob.vercel-storage.com/site-photos/a.png",alt:"아이들",x:20,y:60}
  assert.equal(model.validPhoto(photo,"banner"),true)
  for(const bad of [{x:101},{y:NaN},{alt:""},{src:"javascript:alert(1)"},{src:"https://evil.example/a.png"},{src:"https://example.public.blob.vercel-storage.com/other.png"}]) assert.equal(model.validPhoto({...photo,...bad},"banner"),false)
})
test("home eligibility excludes adopted animals and missing photos",()=>{
  assert.equal(model.eligibleAnimal({status:"보호중",images:["a"]}),true)
  assert.equal(model.eligibleAnimal({status:"임시보호중",images:["a"]}),true)
  assert.equal(model.eligibleAnimal({status:"입양완료",images:["a"]}),false)
  assert.equal(model.eligibleAnimal({status:"보호중",images:[]}),false)
})
function actions(auth,db){return load("src/features/settings/api/homepage-actions.ts",{
  "next/cache":{revalidatePath(){}},"@/shared/lib/auth":{requireAdmin:async()=>auth},
  "@/shared/lib/supabase/admin":{createAdminClient:()=>db},"../lib/homepage":model,
})}
test("all writes reject non-staff before accessing database",async()=>{
  const api=actions({ok:false,error:"denied"},null)
  assert.equal((await api.saveSitePhotos(model.DEFAULT_PHOTOS)).error,"denied")
  assert.equal((await api.changeAnimalPhoto("dogs","id","url")).error,"denied")
  assert.equal((await api.saveHomeAnimals([],true,{})).error,"denied")
})
test("home selection rejects duplicates and more than four",async()=>{
  const api=actions({ok:true,role:"staff"},null)
  assert.ok((await api.saveHomeAnimals(["a","a"],true,{})).error)
  assert.ok((await api.saveHomeAnimals(["a","b","c","d","e"],true,{})).error)
})
test("home save uses one atomic RPC and explains missing migration",async()=>{
  let calls=0
  const api=actions({ok:true,role:"staff"},{rpc:async(name,args)=>{calls++;assert.equal(name,"save_home_animals");assert.equal(args.auto_fill,false);return {error:{code:"PGRST202"}}}})
  assert.match((await api.saveHomeAnimals([],false,{})).error,/SQL/)
  assert.equal(calls,1)
})
test("representative photo rejects stale choice without updating",async()=>{
  let writes=0
  const chain={select(){return this},eq(){return this},single:async()=>({data:{images:["new"]}}),update(){writes++;return this}}
  const api=actions({ok:true,role:"staff"},{from:()=>chain})
  assert.ok((await api.changeAnimalPhoto("dogs","id","old")).error)
  assert.equal(writes,0)
})
test("representative photo compares the image array and rejects concurrent edits",async()=>{
  for(const changed of [false,true]) {
    let updating=false
    const chain={
      select(){return updating ? Promise.resolve({data:changed?[]:[{id:"id"}]}) : this},
      eq(key,value){if(updating && key==="images") assert.equal(value,'{"a","b"}');return this},
      single:async()=>({data:{images:["a","b"]}}),
      update(value){assert.equal(value.thumbnail_index,1);updating=true;return this},
    }
    const api=actions({ok:true,role:"staff"},{from:()=>chain})
    const result=await api.changeAnimalPhoto("dogs","id","b")
    assert.equal(Boolean(result.error),changed)
  }
})

function managerHarness(pinnedCount, save = async()=>({ok:true})) {
  const state=[];let cursor=0;let writes=0
  const {HomepageManager}=load("src/features/settings/components/homepage-manager.tsx",{
    "react/jsx-runtime":jsxRuntime,
    "@/shared/components/toast": { useToast: () => ({ success() {}, error() {} }) },
    react:{useEffect(){},useState(initial){const slot=cursor++;if(!(slot in state))state[slot]=initial;return [state[slot],value=>{state[slot]=typeof value==="function"?value(state[slot]):value}]}},
    "next/image":{default:"img"},"next/navigation":{useRouter:()=>({refresh(){}})},
    "@/shared/components/ui/button":{Button:"button"},"./animal-photo-picker":{AnimalPhotoPicker:"picker"},
    "../lib/homepage":model,"../api/homepage-actions":{saveSitePhotos:async()=>{writes++;return save()},saveHomeAnimals:async()=>{writes++;return {ok:true}}},
  })
  const animals=Array.from({length:pinnedCount+1},(_,i)=>({id:String(i),name:`아이${i}`,status:"보호중",images:["a"],thumbnail_index:0,is_pinned:i<pinnedCount,pin_order:i,rescue_date:null,created_at:"2026-01-01"}))
  const render=()=>{cursor=0;return HomepageManager({initialPhotos:model.DEFAULT_PHOTOS,initialAutoFill:true,animals,maintenance:null,loadError:null})}
  function nodes(node){if(!node||typeof node!=="object")return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)]}
  const text=node=>typeof node==="string"||typeof node==="number"?String(node):Array.isArray(node)?node.map(text).join(""):node?.props?text(node.props.children):""
  return {render,nodes,text,writes:()=>writes,button:(tree,label)=>nodes(tree).find(n=>n.type==="button"&&text(n)===label)}
}
test("legacy seven pins can be explicitly reduced and then replaced without immediate writes",()=>{
  const h=managerHarness(7);let tree=h.render()
  h.button(tree,"현재 순서의 앞 4마리만 유지").props.onClick();tree=h.render()
  const swap=h.button(tree,"교체");assert.equal(swap.props.disabled,false);swap.props.onClick();tree=h.render()
  h.button(tree,"1. 아이0 교체").props.onClick();tree=h.render()
  assert.match(h.text(tree),/1\. 아이4/)
  assert.equal(h.writes(),0)
})
test("photo save feedback stays beside the button and never reports success on failure",async()=>{
  for(const error of [undefined,"저장 실패"]){
    const h=managerHarness(0,async()=>error?{error}:{ok:true});let tree=h.render()
    h.nodes(tree).find(n=>n.type==="input"&&n.props.maxLength===160).props.onChange({target:{value:"새 사진 설명"}})
    tree=h.render();assert.match(h.text(tree),/저장 전 변경사항/)
    await h.button(tree,"사진 설정 저장").props.onClick();tree=h.render()
    assert.equal(h.writes(),1)
    if(error){assert.match(h.text(tree),/저장 실패/);assert.equal(h.button(tree,"저장 완료"),undefined)}
    else {assert.ok(h.button(tree,"저장 완료"));assert.match(h.text(tree),/홈페이지에 반영되었습니다/)}
  }
})
