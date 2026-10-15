import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import ts from "typescript"
import { PDFDocument } from "pdf-lib"

const require = createRequire(import.meta.url)
function load(file) {
  const exports={}
  const code=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
  new Function("exports", "require", code)(exports, name => name.startsWith(".") ? load(path.resolve(path.dirname(file),name+".ts")) : require(name))
  return exports
}
const workflow=load("src/features/applications/lib/adoption-workflow.ts")
test("consultation statuses preserve legacy values without implying adoption completion",()=>{
  assert.equal(workflow.adoptionStatusLabel("접수"),"승인대기")
  assert.equal(workflow.adoptionStatusLabel("승인"),"승인")
  assert.equal(workflow.adoptionStatusLabel("반려"),"거절")
  assert.equal(workflow.adoptionStatusLabel("승인","2026-10-15"),"입양 완료")
})
test("SMS content includes KST, exact name, line breaks and only requested recipients",()=>{
  const when="2026-10-15T05:30:00Z"
  assert.equal(workflow.adoptionVisitLabel(when),"26.10.15 오후 2:30")
  for(const kind of ["received","approved","cancelled-applicant","cancelled-staff"]){
    const text=workflow.buildAdoptionSms(kind,"홍길동",when)
    assert.match(text,/홍길동님/);assert.match(text,/\n/);assert.doesNotMatch(text,/https?:/)
    assert.equal(workflow.adoptionSmsType(text),"SMS")
    if(kind.startsWith("cancelled"))assert.doesNotMatch(text,/26\.10\.15/)
  }
  assert.match(workflow.buildAdoptionSms("cancelled-staff","홍길동"),/홈페이지/)
  for(const kind of ["received","approved","cancelled-applicant","cancelled-staff"]){
    const name="가".repeat(20)
    const text=workflow.buildAdoptionSms(kind,name,"2026-10-15T03:30:00Z")
    assert.ok(text.includes(name));assert.equal(workflow.adoptionSmsType(text),"SMS")
  }
})
const sample={applicant_name:"홍길동",phone:"010-0000-0000",email:"sample@example.com",address:"인천광역시 중구 예시로 00 (가상 주소)",confirmed_visit_at:"2026-10-15T05:30:00Z",dog:{name:"사랑이"},family_size:3,has_children:false,housing_type:"아파트",ownership_type:"자가",current_pets:"없음",past_pet_experience:"가족과 함께 강아지를 12년 동안 돌본 경험이 있습니다.",reason:"가족 모두 입양에 동의했고, 새로운 가족을 맞이할 준비를 하고 있습니다. 아이의 성격과 생활 습관을 상담한 뒤 책임감 있게 돌보고 싶습니다.",visit_available_dates:["2026-10-15"],visit_available_time:"14:30",privacy_agreed:true,qualification_answers:{adult:true,family_consent:true,readiness:true,terms_agreed:true}}
test("PDF embeds Korean and includes all three sections; long answers flow onto more pages",async()=>{
  const { generateAdoptionPdf }=load("src/features/applications/lib/adoption-pdf.ts")
  const font=fs.readFileSync("public/fonts/NanumGothic-Regular.ttf")
  const bold=fs.readFileSync("public/fonts/NanumGothic-Bold.ttf")
  const normal=await generateAdoptionPdf(sample,font,bold)
  const pdf=await PDFDocument.load(normal)
  assert.equal(pdf.getPageCount(),3)
  fs.writeFileSync("/private/tmp/adoption-workflow-verified.pdf",normal)
  const long=await generateAdoptionPdf({...sample,reason:"긴 답변도 누락 없이 출력되어야 합니다.\n".repeat(180)+"마지막문장보존",current_pets:"없음 🐾"},font)
  assert.ok((await PDFDocument.load(long)).getPageCount()>3)
  fs.writeFileSync("/private/tmp/adoption-workflow-long.pdf",long)
})
