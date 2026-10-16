import Link from "next/link"
import { notFound } from "next/navigation"
import { getAccessibleAdoption } from "@/features/applications/api/adoption-access"
import { AdoptionDownload } from "@/features/applications/components/adoption-download"
import { adoptionStatusLabel, adoptionVisitLabel, ADOPTION_CONTACT, ADOPTION_CONTACT_LABEL } from "@/features/applications/lib/adoption-workflow"
import { CancelMyApplicationButton } from "../../cancel-button"

export const dynamic="force-dynamic"
export default async function AdoptionVisitPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const result=await getAccessibleAdoption(id)
  if(!result)notFound()
  const app=result.application
  const ready=app.status==="승인"&&!!app.confirmed_visit_at
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <Link href="/my/applications" className="inline-flex min-h-11 items-center text-sm text-muted-foreground">← 신청 내역</Link>
    <p className="mt-5 text-sm font-semibold text-primary">{adoptionStatusLabel(app.status,app.completed_at)}</p>
    <h1 className="mt-2 text-2xl font-bold">{app.completed_at?"새로운 가족이 되었습니다":ready?"방문에 필요한 서류가 준비되었습니다":"입양상담 신청 내역"}</h1>
    {ready&&<p className="mt-3 text-muted-foreground">아래 서류를 내려받아 출력해 준비해주세요.</p>}
    <section className="mt-6 rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{app.applicant_name}님 방문 일정</p><p className="mt-2 text-xl font-semibold">{adoptionVisitLabel(app.confirmed_visit_at)}</p><p className="mt-4 text-sm">처음 희망한 아이: {app.dog?.name??app.cat?.name??app.preferred_animal??"상담 후 결정"}</p>
      {app.completed_at&&<p className="mt-3 text-sm">실제 입양한 아이: {app.actual_animal_name} · 입양일: {app.adoption_date}</p>}
      {app.status==="반려"&&<p className="mt-3 whitespace-pre-wrap text-sm">거절 사유: {app.rejection_reason||app.admin_note||"입양담당팀장에게 문의해주세요."}</p>}
      {app.status==="취소"&&<p className="mt-3 whitespace-pre-wrap text-sm">취소 사유: {app.cancel_reason}</p>}
    </section>
    {ready?<section className="mt-4 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">입양상담 방문 서류</h2><ol className="my-4 divide-y divide-border text-sm"><li className="py-3">상담 사전정보 · 입력한 내용 자동 반영</li><li className="py-3">입양 설문지 · 현장 작성</li><li className="py-3">입양 신청서 · 현장 작성·서명</li></ol><AdoptionDownload id={id}/><p className="mt-4 text-sm">설문지와 신청서의 작성·서명은 현장 상담 후 진행합니다.</p><p className="mt-2 text-xs text-muted-foreground">개인정보가 포함되어 있으니 보관에 유의해주세요. 입력 분량에 따라 페이지가 추가될 수 있습니다.</p></section>:!["반려","취소"].includes(app.status)&&<p className="mt-5 rounded-lg bg-secondary p-4 text-sm">방문 일정 승인 후 서류를 다운로드할 수 있습니다.</p>}
    <details className="mt-4 rounded-xl border border-border bg-card p-5"><summary className="cursor-pointer font-semibold">내 사전정보 확인</summary><dl className="mt-4 space-y-3 text-sm">{[
      ["이름",app.applicant_name],["연락처",app.phone],["주소",app.address],
      ["가족 구성원",app.family_size==null?null:`${app.family_size}명`],["어린이 동거",app.has_children==null?null:app.has_children?"있음":"없음"],
      ["주거 형태",app.housing_type],["소유 형태",app.ownership_type],["현재 반려동물",app.current_pets],["양육 경험",app.past_pet_experience],["입양 이유",app.reason],
      ["신청 당시 방문 가능일",app.visit_available_dates.join(", ")],["방문 가능 시간",app.visit_available_time],["개인정보 동의",app.privacy_agreed?"동의함":"동의 기록 없음"],
    ].map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value||"미입력"}</dd></div>)}</dl></details>
    <p className="my-5 text-sm">{ADOPTION_CONTACT_LABEL}: <a href={`tel:${ADOPTION_CONTACT}`} className="underline">{ADOPTION_CONTACT}</a></p>
    {!app.completed_at&&["접수","검토중","승인"].includes(app.status)&&<CancelMyApplicationButton id={id} kind="adoption" triggerClassName="min-h-11 rounded-lg border border-border px-4 text-sm"/>}
    <p className="mt-4 text-xs text-muted-foreground">상담 방문 승인은 입양 확정을 의미하지 않습니다.</p>
  </main>
}
