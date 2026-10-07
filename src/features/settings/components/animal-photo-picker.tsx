"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { changeAnimalPhoto } from "../api/homepage-actions"
import { Button } from "@/shared/components/ui/button"
import { useToast } from "@/shared/components/toast"

type Props = { name: string; images: string[]; index: number; onChoose: (image: string) => Promise<string | undefined>; draft?: boolean; disabled?: boolean; compact?: boolean }
export function AnimalPhotoPicker({ name, images, index, onChoose, draft, disabled, compact }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(index)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return <>
    <Button type="button" variant={compact ? "ghost" : "outline"} disabled={disabled || !images.length} className="min-h-11 px-3 text-xs" onClick={() => { setSelected(images[index] ? index : 0); setError(""); dialog.current?.showModal() }} aria-label={`${name} 대표사진 변경`}>{compact ? "대표사진" : "대표사진 변경"}</Button>
    <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault() }} aria-label={`${name} 대표사진 선택`} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-auto rounded-2xl border border-border bg-card p-5 text-foreground backdrop:bg-black/50 [&_button]:min-h-11">
      <h2 className="text-lg font-bold">{name} 대표사진</h2>
      <p className="mt-2 text-sm text-muted-foreground">홈·목록·상세에 함께 반영됩니다.{draft && " 선택 후 홈페이지 관리에서 저장해 주세요."}</p>
      <div className="my-5 grid grid-cols-3 gap-3">{images.map((src, i) => <button key={`${src}-${i}`} type="button" disabled={busy} aria-label={`${i + 1}번 사진`} aria-pressed={selected === i} onClick={() => setSelected(i)} className={`relative aspect-square overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-ring ${selected === i ? "border-primary" : "border-transparent"}`}>
        <Image src={src} alt={`${name} ${i + 1}번 사진`} fill sizes="160px" className="object-cover" />
        {selected === i && <span className="absolute inset-x-0 bottom-0 bg-primary py-1 text-xs text-primary-foreground">선택됨</span>}
      </button>)}</div>
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => dialog.current?.close()}>취소</Button><Button type="button" disabled={busy || !images[selected]} onClick={async () => {
        setBusy(true); setError("")
        try { const message = await onChoose(images[selected]); if (message) setError(message); else dialog.current?.close() } catch { setError("저장에 실패했습니다. 다시 시도해 주세요.") } finally { setBusy(false) }
      }}>{busy ? "처리 중…" : draft ? "이 사진 선택" : "대표사진 저장"}</Button></div>
    </dialog>
  </>
}

export function QuickAnimalPhoto({ kind, id, name, images, index, compact }: { kind: "dogs" | "cats"; id: string; name: string; images: string[]; index: number; compact?: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [message, setMessage] = useState("")
  return <div className={compact ? "" : "mt-2"}><AnimalPhotoPicker name={name} images={images} index={index} compact={compact} onChoose={async image => {
    const result = await changeAnimalPhoto(kind, id, image)
    if (result.error) return result.error
    setMessage("대표사진 저장됨"); toast.success(`${name} 대표사진이 저장되었습니다.`); router.refresh()
  }} /><span role="status" className={compact ? "sr-only" : "block text-xs text-muted-foreground"}>{message}</span></div>
}
