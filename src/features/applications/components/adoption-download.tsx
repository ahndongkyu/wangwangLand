"use client"
import { useState } from "react"
import { useToast } from "@/shared/components/toast"

export function AdoptionDownload({ id }: { id: string }) {
  const [pending,setPending]=useState(false)
  const [error,setError]=useState("")
  const toast=useToast()
  async function download(){
    if(pending)return
    setPending(true);setError("")
    try{
      const res=await fetch(`/api/adoption/${id}/documents`,{cache:"no-store"})
      if(!res.ok){const body=await res.json().catch(()=>null);throw new Error(body?.error || "다운로드하지 못했습니다.")}
      const url=URL.createObjectURL(await res.blob())
      const link=document.createElement("a");link.href=url;link.download="왕왕랜드_입양상담_방문서류.pdf";document.body.append(link);link.click();link.remove()
      setTimeout(()=>URL.revokeObjectURL(url),60000)
      toast.success("서류 다운로드를 시작했습니다. 다운로드 목록을 확인해주세요.")
    }catch(e){setError(e instanceof Error?e.message:"다운로드하지 못했습니다.")}finally{setPending(false)}
  }
  return <><button type="button" disabled={pending} onClick={download} className="min-h-12 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{pending?"서류 만드는 중…":"방문 서류 다운로드"}</button>{error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</>
}
