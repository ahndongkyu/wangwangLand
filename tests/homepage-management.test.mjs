import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
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
