"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { saveHomepagePopup, deleteHomepagePopup } from "../api/popup-actions"
import { fromKoreanInput, toKoreanInput, popupStatus, popupValidation, type HomepagePopup, type PopupPlacement } from "../lib/popups"
import { PopupContent, PopupDialog } from "./homepage-popup"

const fieldClass = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground"
const labelClass = "block text-sm font-medium"
const stamp = (value: string) => toKoreanInput(value).replace("T", " ")

function newPopup(): HomepagePopup {
  const now = new Date()
  now.setSeconds(0, 0)
  return { id: crypto.randomUUID(), revision: crypto.randomUUID(), title: "", body: "", image: "", imageAlt: "", linkLabel: "자세히 보기", linkUrl: "", startsAt: now.toISOString(), endsAt: new Date(now.getTime() + 86400000).toISOString(), enabled: false, placements: ["home"] }
}

export function PopupManager({ initialPopups, loadError }: { initialPopups: HomepagePopup[]; loadError: string | null }) {
  const router = useRouter(), confirm = useConfirm()
  const toast = useToast()
  const [items, setItems] = useState(initialPopups)
  const [draft, setDraft] = useState<HomepagePopup | null>(null)
  const [saved, setSaved] = useState<HomepagePopup | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [mobile, setMobile] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [inlineClosed, setInlineClosed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const errorRef = useRef<HTMLParagraphElement>(null)
  const listRef = useRef<HTMLHeadingElement>(null)
  function fail(message: string) { setError(message); toast.error(message) }
  const dirty = Boolean(draft && JSON.stringify(draft) !== JSON.stringify(saved))
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, busy])
  async function select(popup: HomepagePopup | null) {
    if (dirty && !await confirm({ variant: "warning", title: "저장하지 않은 변경사항을 버릴까요?", confirmText: "변경사항 버리기" })) return
    setDraft(popup ? { ...popup } : newPopup()); setSaved(popup)
    setError(""); setMessage(""); setInlineClosed(false)
  }
  function change<K extends keyof HomepagePopup>(key: K, value: HomepagePopup[K]) {
    setDraft(previous => previous ? { ...previous, [key]: value } : null)
    setMessage(""); setError(""); setInlineClosed(false)
  }
  async function save() {
    if (!draft || busy || loadError) return
    const validation = popupValidation(draft)
    if (validation) { fail(validation); return }
    setBusy(true); setMessage(""); setError("")
    try {
      const result = await saveHomepagePopup(draft, saved?.revision ?? null)
      if (result.error || !result.popup) { fail(result.error ?? "저장하지 못했습니다."); return }
      const updated = result.popup
      setItems(previous => [updated, ...previous.filter(p => p.id !== updated.id)].sort((a,b) => b.startsAt.localeCompare(a.startsAt)))
      setDraft(null); setSaved(null); setPreviewOpen(false); setInlineClosed(false); setMobile(false); setNow(Date.now())
      setMessage("저장 완료 · " + popupStatus(updated) + " · 홈페이지에는 최대 30초 이내 반영됩니다.")
      toast.success("팝업이 저장되었습니다. · " + popupStatus(updated))
      listRef.current?.focus({ preventScroll: true })
      listRef.current?.scrollIntoView({ block: "start" })
      router.refresh()
    } catch { fail("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.") }
    finally { setBusy(false) }
  }
  async function remove(popup: HomepagePopup) {
    if (busy || loadError) return
    if (!await confirm({ variant: "destructive", title: "팝업을 삭제할까요?", description: "‘" + popup.title + "’ 안내가 삭제됩니다. 복구할 수 없습니다.", confirmText: "삭제" })) return
    setBusy(true); setError(""); setMessage("")
    try {
      const result = await deleteHomepagePopup(popup.id, popup.revision)
      if (result.error) { fail(result.error); return }
      setItems(previous => previous.filter(p => p.id !== popup.id))
      if (draft?.id === popup.id) { setDraft(null); setSaved(null) }
      setMessage("삭제했습니다. 홈페이지에는 최대 30초 이내 반영됩니다.")
      toast.success("팝업이 삭제되었습니다.")
      router.refresh()
    } catch { fail("삭제하지 못했습니다. 다시 시도해 주세요.") }
    finally { setBusy(false) }
  }
  return <section aria-label="팝업 관리" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 ref={listRef} tabIndex={-1} className="scroll-mt-24 text-lg font-semibold">팝업 관리</h2><p className="mt-1 text-sm text-muted-foreground">행사나 봉사 전 확인할 안내를 예약해서 노출할 수 있습니다.</p></div>
      <Button type="button" disabled={busy || !!loadError} onClick={() => select(null)}>새 팝업</Button>
    </div>
    {loadError && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{loadError}</p>}
    <div className="my-5 divide-y divide-border rounded-xl border border-border bg-card">
      {!items.length && <p className="p-5 text-sm text-muted-foreground">등록된 팝업이 없습니다. ‘새 팝업’에서 안내를 등록해 주세요.</p>}
      {items.map(popup => <article key={popup.id} className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1 basis-52"><div className="flex items-start gap-2"><span className="shrink-0 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{popupStatus(popup, now)}</span><h3 className="break-words font-medium [overflow-wrap:anywhere]">{popup.title}</h3></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{stamp(popup.startsAt)} ~ {stamp(popup.endsAt)} (한국 시간)<br/>{popup.placements.map(p => p === "home" ? "홈페이지" : "봉사 신청").join(" · ")}</p></div>
        <Button type="button" variant="outline" disabled={busy || !!loadError} onClick={() => select(popup)}>수정</Button>
        <Button type="button" variant="ghost" disabled={busy || !!loadError} onClick={() => remove(popup)}>삭제</Button>
      </article>)}
    </div>
    {draft && <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">{saved ? "팝업 수정" : "팝업 등록"}</h3><span className="text-xs text-muted-foreground">{dirty ? "저장 전 변경사항 있음" : "저장된 설정"}</span></div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <fieldset disabled={busy || !!loadError} className="min-w-0 space-y-5">
          <label className={labelClass}>제목 <span className="text-primary">(필수)</span><input className={fieldClass} value={draft.title} maxLength={90} onChange={e => change("title", e.target.value)} /></label>
          <label className={labelClass}>안내 내용 <span className="text-primary">(필수)</span><textarea className={fieldClass + " min-h-40 leading-7"} value={draft.body} maxLength={5000} onChange={e => change("body", e.target.value)} /><span className="mt-1 block text-xs text-muted-foreground">{draft.body.length.toLocaleString()} / 5,000자 · 입력한 줄바꿈이 유지됩니다.</span></label>
          <label className={labelClass}>이미지 첨부 <span className="text-muted-foreground">(선택)</span><input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:text-foreground" onChange={async event => {
            const file = event.target.files?.[0]; event.target.value = ""; if (!file) return
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) { setError("JPG·PNG·WebP 이미지를 4MB 이하로 올려 주세요."); return }
            setBusy(true); setError(""); setMessage("")
            try {
              const response = await fetch("/api/admin/site-photo", { method: "POST", body: file })
              const data = await response.json().catch(() => null)
              if (!response.ok || !data?.url) throw new Error(data?.error ?? "이미지를 업로드하지 못했습니다.")
              setDraft(previous => previous ? { ...previous, image: data.url, imageAlt: previous.imageAlt || previous.title } : null)
              setInlineClosed(false); setMessage("이미지를 올렸습니다. 팝업 설정을 저장해야 반영됩니다.")
            } catch (err) { setError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.") }
            finally { setBusy(false) }
          }}/><span className="mt-2 block text-xs text-muted-foreground">JPG·PNG·WebP, 최대 4MB. 이미지는 원본 비율로 표시됩니다.</span></label>
          {draft.image && <div className="space-y-2"><label className={labelClass}>이미지 설명 (필수)<input className={fieldClass} value={draft.imageAlt} maxLength={160} onChange={e => change("imageAlt", e.target.value)} /></label><Button type="button" variant="outline" onClick={() => change("image", "")}>이미지 제거</Button></div>}
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">예약 기간에 팝업 공개<input type="checkbox" role="switch" className="h-6 w-11 accent-primary" checked={draft.enabled} onChange={e => change("enabled", e.target.checked)} /></label>
            <label className={labelClass}>노출 시작 · 한국 시간<input type="datetime-local" className={fieldClass} value={toKoreanInput(draft.startsAt)} onChange={e => change("startsAt", fromKoreanInput(e.target.value))}/></label>
            <label className={labelClass}>노출 종료 · 한국 시간<input type="datetime-local" className={fieldClass} value={toKoreanInput(draft.endsAt)} onChange={e => change("endsAt", fromKoreanInput(e.target.value))}/></label>
            <p className="text-xs text-muted-foreground">공개를 켜고 저장해도 예약 기간에만 노출됩니다. 종료 시간이 지나면 자동으로 숨겨집니다.</p>
          </div>
          <fieldset><legend className="text-sm font-medium">노출 위치 (하나 이상 선택)</legend>{(["home", "volunteer"] as PopupPlacement[]).map(placement => <label key={placement} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-primary" checked={draft.placements.includes(placement)} onChange={e => change("placements", e.target.checked ? [...draft.placements, placement] : draft.placements.filter(p => p !== placement))}/>{placement === "home" ? "홈페이지" : "봉사 신청 페이지"}</label>)}</fieldset>
          <label className={labelClass}>연결 버튼 문구<input className={fieldClass} maxLength={24} value={draft.linkLabel} onChange={e => change("linkLabel", e.target.value)}/></label>
          <label className={labelClass}>연결 주소 (선택)<input className={fieldClass} maxLength={2048} placeholder="/volunteer 또는 https://로 시작하는 주소" value={draft.linkUrl} onChange={e => change("linkUrl", e.target.value)}/><span className="mt-2 block text-xs text-muted-foreground">주소를 비워 두면 버튼이 표시되지 않습니다.</span></label>
        </fieldset>
        <section aria-label="저장 전 미리보기" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">미리보기</h3><div className="flex gap-2"><Button type="button" variant={mobile ? "outline" : "default"} aria-pressed={!mobile} onClick={() => setMobile(false)}>PC</Button><Button type="button" variant={mobile ? "default" : "outline"} aria-pressed={mobile} onClick={() => setMobile(true)}>모바일</Button></div></div>
          <div className="flex min-h-[430px] items-center justify-center rounded-xl border border-border bg-muted/50 p-3">
            {inlineClosed ? <Button type="button" variant="outline" onClick={() => setInlineClosed(false)}>팝업 다시 보기</Button> : <div className={"flex h-[430px] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg " + (mobile ? "max-w-[351px]" : "max-w-[480px]")}><PopupContent popup={draft} preview onClose={() => setInlineClosed(true)} onHideToday={() => setInlineClosed(true)} /></div>}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">제목·내용·이미지가 즉시 반영됩니다. 본문만 스크롤되며 닫기 버튼은 항상 남습니다.</p>
          <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setPreviewOpen(true)}>실제 크기로 보기</Button>
          <p className="mt-5 rounded-xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">미리보기는 실제로 공개되지 않습니다.<br/>‘오늘 하루 보지 않기’는 방문자의 브라우저에서 현재 묶인 안내를 한국 시간 자정까지 숨깁니다. 새로 등록한 안내는 별도로 노출됩니다.</p>
        </section>
      </div>
      <PopupDialog open={previewOpen} popup={draft} preview mobile={mobile} onClose={() => setPreviewOpen(false)} onHideToday={() => setPreviewOpen(false)} />
    </div>}
    <div className="mt-5 rounded-xl border border-border bg-card p-4">
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <p role="status" className="text-sm text-muted-foreground">{busy ? "처리 중입니다. 잠시 기다려 주세요." : message || (dirty ? "저장 전 변경사항이 있습니다." : "설정을 저장해야 홈페이지에 반영됩니다.")}</p>
      {draft && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" disabled={busy || !!loadError || !dirty} onClick={save}>{busy ? "처리 중…" : "팝업 설정 저장"}</Button><Button type="button" variant="outline" disabled={busy} onClick={async () => { if (dirty && !await confirm({ variant: "warning", title: "변경사항을 취소할까요?", confirmText: "변경 취소" })) return; setDraft(saved); setError(""); setMessage("") }}>변경 취소</Button></div>}
    </div>
  </section>
}
