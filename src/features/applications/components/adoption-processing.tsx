"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { processAdoption } from "../api/adoption-workflow"
import { searchAdoptionAnimals, type AdoptionAnimal } from "../api/adoption-animals"
import { adoptionStatusLabel, adoptionVisitLabel } from "../lib/adoption-workflow"
import type { AdoptionRow } from "../api/queries"
import { useToast } from "@/shared/components/toast"
import { AdoptionDownload } from "./adoption-download"

export interface AdoptionDocument { id:string;kind:string;filename:string;created_at:string }
const input="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base"
export function AdoptionProcessing({ app, documents }: { app:AdoptionRow;documents:AdoptionDocument[] }) {
  const router=useRouter(),toast=useToast()
  const [pending,start]=useTransition()
  const [error,setError]=useState("")
  const errorRef=useRef<HTMLParagraphElement>(null)
  function showError(message:string){setError(message);requestAnimationFrame(()=>{errorRef.current?.focus();errorRef.current?.scrollIntoView({block:"center",behavior:"smooth"})})}
  const [search,setSearch]=useState("")
  const [searching,setSearching]=useState(false)
  const [animals,setAnimals]=useState<AdoptionAnimal[]>([])
  const [animal,setAnimal]=useState<AdoptionAnimal|null>(null)
  const [mode,setMode]=useState("approve")
  const [uploading,setUploading]=useState(false)
  function submit(form:FormData){
    form.set("expected_updated_at",app.updated_at);setError("")
    start(async()=>{try{
      const result=await processAdoption(app.id,form)
      if(result.error){showError(result.error);return}
      toast.success("저장되었습니다.");if(result.warning)toast.error(result.warning)
      router.refresh()
    }catch{showError("처리 결과를 확인하지 못했습니다. 새로고침 후 상태를 먼저 확인해주세요.")}})
  }
  async function find(){setSearching(true);setError("");try{const result=await searchAdoptionAnimals(search);setAnimals(result.animals);if(result.error)setError(result.error)}catch{setError("아이를 검색하지 못했습니다.")}finally{setSearching(false)}}
  const kinds=new Set(documents.map(d=>d.kind))
  return <div className="space-y-4">
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">{adoptionStatusLabel(app.status,app.completed_at)}</h2>
      {error&&<p ref={errorRef} tabIndex={-1} role="alert" className="mt-3 whitespace-pre-wrap text-sm text-destructive">{error}</p>}
      {app.confirmed_visit_at&&<p className="mt-2 font-medium">방문: {adoptionVisitLabel(app.confirmed_visit_at)}</p>}
      {app.completed_at?<div className="mt-3 space-y-2 text-sm"><p>실제 입양한 아이: <strong>{app.actual_animal_name}</strong></p><p>입양일: {app.adoption_date}</p><p>실제 입양자: {app.actual_adopter_name} · {app.actual_adopter_phone}</p></div>:null}
      {app.status==="반려"&&<p className="mt-3 text-sm">거절 사유: {app.rejection_reason || app.admin_note || "기존 기록에 사유 없음"}</p>}
      {app.status==="취소"&&<p className="mt-3 text-sm">취소 사유: {app.cancel_reason}</p>}
      {!app.completed_at&&(["접수","검토중"].includes(app.status)||(app.status==="승인"&&!app.confirmed_visit_at))&&<form onSubmit={e=>{e.preventDefault();submit(new FormData(e.currentTarget))}} className="mt-4 space-y-3">
        <fieldset disabled={pending} className="min-w-0 space-y-3">
          {app.status!=="승인"&&<label className="block text-sm">처리<select name="action" value={mode} onChange={e=>setMode(e.target.value)} className={input}><option value="approve">방문 승인</option><option value="reject">거절</option></select></label>}
          {app.status==="승인"&&<input type="hidden" name="action" value="approve"/>}
          {mode==="approve"?<><label className="block text-sm">확정 방문 날짜<input required name="visit_date" type="date" defaultValue={app.visit_available_dates[0]} className={input+" application-date-input"}/></label><label className="block text-sm">확정 방문 시간<input required name="visit_time" type="time" defaultValue={app.visit_available_time??""} className={input+" application-date-input"}/></label></>:<label className="block text-sm">거절 사유<textarea name="reason" required maxLength={2000} className={input+" min-h-24"}/></label>}
          <button className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{pending?"저장 중…":mode==="reject"?"거절 처리":"방문 일정 확정"}</button>
        </fieldset>
      </form>}
      {app.status==="승인"&&app.confirmed_visit_at&&<div className="mt-4"><AdoptionDownload id={app.id}/></div>}
    </section>
    {app.status==="승인"&&!app.completed_at&&<section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-semibold">실제 입양 완료</h2><p className="mt-2 text-sm text-muted-foreground">현장 상담·서명 및 아이 인계 후 처리해주세요. 최초 희망 아이는 그대로 보존됩니다.</p>
      <div className="mt-3 flex gap-2"><label className="min-w-0 flex-1"><span className="text-sm">실제 입양한 아이 검색</span><input value={search} onChange={e=>setSearch(e.target.value)} className={input}/></label><button type="button" onClick={find} disabled={searching} className="mt-6 min-h-11 rounded-lg border px-3">{searching?"검색 중":"검색"}</button></div>
      <ul className="mt-2 space-y-1">{animals.map(a=><li key={a.kind+a.id}><button type="button" aria-pressed={animal?.id===a.id&&animal?.kind===a.kind} onClick={()=>setAnimal(a)} className="min-h-11 w-full rounded-lg border border-border px-3 text-left aria-pressed:border-primary aria-pressed:bg-primary/10">{a.name} · {a.kind==="dog"?"강아지":"고양이"}</button></li>)}</ul>
      {animal&&<p className="mt-2 text-sm text-primary">선택: {animal.name}</p>}
      <form onSubmit={e=>{e.preventDefault();submit(new FormData(e.currentTarget))}} className="mt-3"><fieldset disabled={pending} className="space-y-3">
        <input type="hidden" name="action" value="complete"/><input type="hidden" name="animal_kind" value={animal?.kind??""}/><input type="hidden" name="animal_id" value={animal?.id??""}/>
        <label className="block text-sm">실제 입양일<input required type="date" name="adoption_date" className={input+" application-date-input"}/></label>
        <label className="block text-sm">실제 입양자 이름<input required name="adopter_name" defaultValue={app.applicant_name} maxLength={100} className={input}/></label>
        <label className="block text-sm">실제 입양자 연락처<input required type="tel" name="adopter_phone" defaultValue={app.phone} className={input}/></label>
        <p className="text-xs text-muted-foreground">신청자와 실제 입양자가 다르면 위 정보를 수정해주세요. 서류는 나중에 첨부해도 됩니다.</p>
        <button disabled={!animal||pending} className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{pending?"저장 중…":"입양 완료 및 아이 상태 반영"}</button>
      </fieldset></form>
    </section>}
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5"><h2 className="font-semibold">현장 서류 · {kinds.size===0?"미첨부":kinds.has("survey")&&kinds.has("application")?"첨부 완료":"일부 첨부"}</h2><p className="mt-2 text-xs text-muted-foreground">운영진만 열람할 수 있습니다. 입양 완료 후에도 첨부 가능합니다.</p>
      <ul className="my-3 space-y-2">{documents.map(d=><li key={d.id} className="break-all text-sm"><a className="underline" href={`/api/admin/adoption-documents?id=${d.id}`}>{d.kind==="survey"?"설문지":"신청서"} · {d.filename}</a></li>)}</ul>
      <form onSubmit={async e=>{e.preventDefault();if(uploading)return;const form=e.currentTarget;const data=new FormData(form);data.set("application_id",app.id);setUploading(true);setError("");try{const res=await fetch("/api/admin/adoption-documents",{method:"POST",body:data});const result=await res.json().catch(()=>null);if(!res.ok)throw new Error(result?.error||"첨부하지 못했습니다.");toast.success("서류가 저장되었습니다.");form.reset();router.refresh()}catch(e){showError(e instanceof Error?e.message:"첨부하지 못했습니다.")}finally{setUploading(false)}}}><fieldset disabled={uploading} className="space-y-3">
        <label className="block text-sm">서류 종류<select name="kind" className={input}><option value="survey">설문지</option><option value="application">신청서</option></select></label>
        <label className="block text-sm">파일 (PDF·JPG·PNG·WebP, 3MB 이하)<input required name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 block w-full min-w-0 text-sm"/></label>
        <button className="min-h-11 w-full rounded-lg border border-border px-3 font-medium">{uploading?"저장 중…":"서류 첨부"}</button>
      </fieldset></form>
    </section>
  </div>
}
