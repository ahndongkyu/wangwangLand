"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import { DeliveryCard } from "./delivery-card"
import { saveOperatingInfo } from "../api/operating-actions"
import { type OperatingGroup, type OperatingSnapshot } from "../lib/operating-info"

const sections = { delivery: "배송 안내", contact: "연락처·SNS", account: "후원 계좌" }
const labels: Record<string, string> = { recipient: "받는 사람", address: "배송 주소", detail: "상세주소 · 선택", phone: "수령 연락처 · 선택", note: "배송 안내 문구 · 선택", volunteerPhone: "봉사 담당 연락처", adoptionPhone: "입양 담당 연락처", kakaoChannel: "카카오톡 채널", naverCafe: "네이버 카페 · 선택", instagram: "인스타그램 · 선택", bankName: "은행", accountNumber: "계좌번호", accountHolder: "예금주" }
export function OperatingManager({ initial, section }: { initial: OperatingSnapshot; section?: OperatingGroup }) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [group, setGroup] = useState<OperatingGroup>(section ?? "delivery")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [confirmAccount, setConfirmAccount] = useState(false)
  const lock = useRef(false)
  const router = useRouter()
  const toast = useToast()
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const groupDirty = JSON.stringify(saved[group].data) !== JSON.stringify(draft[group].data)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  async function save() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(""); setMessage("")
    try {
      const result = await saveOperatingInfo(group, draft[group].data, saved[group].revision)
      if (result.error || !result.data) { const text = result.error || "저장하지 못했습니다."; setError(text); toast.error(text); return }
      const next = { ...draft[group], data: result.data, revision: result.revision!, error: null }
      setSaved(previous => ({ ...previous, [group]: next })); setDraft(previous => ({ ...previous, [group]: next }))
      setMessage("저장 완료 · 홈페이지에 반영되었습니다."); toast.success("설정이 저장되었습니다."); setConfirmAccount(false); router.refresh()
    } catch { setError("저장 결과를 확인하지 못했습니다. 새로고침 후 확인해 주세요."); toast.error("저장 결과를 확인하지 못했습니다.") }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="mb-8 min-w-0">
    {!section && <nav aria-label="운영 정보 분류" className="mb-4 flex flex-wrap gap-2">{(Object.keys(sections) as OperatingGroup[]).map(key => <Button key={key} type="button" disabled={busy} variant={group === key ? "default" : "outline"} aria-pressed={group === key} onClick={() => { setGroup(key); setError(""); setMessage(""); setConfirmAccount(false) }}>{sections[key]}{JSON.stringify(saved[key].data) !== JSON.stringify(draft[key].data) ? " · 변경됨" : ""}</Button>)}</nav>}
    <form className="rounded-xl border border-border bg-card p-4 sm:p-6" onSubmit={event => { event.preventDefault(); if (group === "account" && !confirmAccount) { setConfirmAccount(true); return } void save() }}>
      <h2 className="text-lg font-semibold">{sections[group]}</h2>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">{group === "delivery" ? "홈과 후원 안내에 함께 반영됩니다. 보호소 방문 주소는 변경되지 않습니다." : group === "contact" ? "홈페이지 안내와 담당자 문자 알림에 사용됩니다. 공개해도 되는 연락처를 입력해 주세요." : "홈과 후원 안내에 함께 반영됩니다. 계좌 정보는 저장 전 다시 확인합니다."}</p>
      {draft[group].error && <p role="alert" className="mb-4 text-sm text-destructive">{draft[group].error} 새로고침 후 다시 확인해 주세요.</p>}
      <fieldset disabled={busy || !!draft[group].error} className="min-w-0 space-y-4">
        {Object.entries(draft[group].data ?? {}).map(([key, value]) => <label key={`${group}-${key}`} className="block text-sm font-medium">{labels[key]}
          {key === "note" ? <textarea rows={3} maxLength={500} className="mt-2 block w-full min-w-0 rounded-lg border border-input bg-background p-3 text-base" value={value} onChange={e => { setDraft(prev => ({ ...prev, [group]: { ...prev[group], data: { ...prev[group].data, [key]: e.target.value } } })); setMessage("") }} /> : <input required={!["detail", "phone", "naverCafe", "instagram"].includes(key)} type={key.toLowerCase().includes("phone") ? "tel" : ["kakaoChannel", "naverCafe", "instagram"].includes(key) ? "url" : "text"} maxLength={["kakaoChannel", "naverCafe", "instagram"].includes(key) ? 2048 : 200} className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base" value={value} onChange={e => { setDraft(prev => ({ ...prev, [group]: { ...prev[group], data: { ...prev[group].data, [key]: e.target.value } } })); setMessage(""); setConfirmAccount(false) }} />}
        </label>)}
        {group === "delivery" && draft.delivery.data && <div><p className="mb-2 text-xs text-muted-foreground">저장 전 노출 미리보기</p><DeliveryCard data={draft.delivery.data} /></div>}
        {confirmAccount && <div className="rounded-lg bg-primary/5 p-4 text-sm" role="status">아래 계좌로 변경할까요?<p className="mt-2 break-words font-semibold">{draft.account.data?.bankName} {draft.account.data?.accountNumber} · {draft.account.data?.accountHolder}</p></div>}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4"><Button disabled={!groupDirty} type="submit">{busy ? "저장 중…" : confirmAccount ? "확인 후 저장" : "설정 저장"}</Button><Button disabled={!groupDirty} type="button" variant="outline" onClick={() => { setDraft(prev => ({ ...prev, [group]: saved[group] })); setConfirmAccount(false); setError(""); setMessage("") }}>변경 취소</Button><span className="text-xs text-muted-foreground">{groupDirty ? "저장 전 변경사항이 있습니다." : "현재 저장된 정보입니다."}</span></div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}<p role="status" className="mt-3 text-sm text-primary">{message}</p>
    </form>
  </section>
}
