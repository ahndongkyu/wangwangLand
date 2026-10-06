"use client"

import { Dialog } from "@base-ui/react/dialog"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { activePopups, nextKoreanMidnight, popupStorageKey, type HomepagePopup } from "../lib/popups"

type ContentProps = {
  popup: HomepagePopup
  onClose: () => void
  onHideToday: () => void
  preview?: boolean
  modal?: boolean
  index?: number
  count?: number
  onNavigate?: (direction: number) => void
}

export function PopupContent({ popup, onClose, onHideToday, preview, modal, index = 0, count = 1, onNavigate }: ContentProps) {
  const close = (top = false) => modal
    ? <Dialog.Close render={<Button variant={top ? "ghost" : "outline"} className="min-h-11 min-w-14 shrink-0" />} aria-label={top ? "팝업 닫기" : undefined}>닫기{top ? " ×" : ""}</Dialog.Close>
    : <Button type="button" variant={top ? "ghost" : "outline"} className="min-h-11 min-w-14 shrink-0" onClick={onClose}>닫기{top ? " ×" : ""}</Button>
  return <>
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
      <span className="text-xs font-semibold text-primary">왕왕랜드 안내{preview ? " · 미리보기" : ""}</span>{close(true)}
    </header>
    <div key={popup.id} data-popup-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [overflow-wrap:anywhere] sm:px-6">
      {modal ? <Dialog.Title className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">{popup.title || "팝업 제목"}</Dialog.Title> : <h3 className="text-xl font-bold leading-snug tracking-tight">{popup.title || "팝업 제목"}</h3>}
      <p className="mt-4 whitespace-pre-wrap text-base leading-7">{popup.body || "안내 내용을 입력해 주세요."}</p>
      {popup.image && <div className="mt-5">
        {/* 첨부 포스터의 원본 비율과 작은 글자를 유지합니다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={popup.image} alt={popup.imageAlt || "안내 이미지"} className="h-auto w-full rounded-lg" />
      </div>}
      {popup.linkUrl && (preview
        ? <Button type="button" className="mt-6 min-h-11 w-full whitespace-normal" onClick={onClose}>{popup.linkLabel || "자세히 보기"}</Button>
        : <a href={popup.linkUrl} onClick={onClose} className="mt-6 flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{popup.linkLabel}</a>)}
    </div>
    {count > 1 && <nav aria-label="다른 팝업 안내" className="flex shrink-0 items-center justify-center gap-3 border-t border-border px-3 py-1">
      <Button type="button" variant="ghost" className="min-h-11 min-w-11" disabled={index === 0} onClick={() => onNavigate?.(-1)}>이전</Button>
      <span role="status" className="text-xs tabular-nums text-muted-foreground">{index + 1} / {count}</span>
      <Button type="button" variant="ghost" className="min-h-11 min-w-11" disabled={index === count - 1} onClick={() => onNavigate?.(1)}>다음</Button>
    </nav>}
    <footer data-popup-footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
      <Button type="button" variant="ghost" className="min-h-11 min-w-0 flex-1 whitespace-normal text-left text-sm text-muted-foreground" onClick={onHideToday}>오늘 하루 보지 않기</Button>{close()}
    </footer>
  </>
}

export function PopupDialog(props: ContentProps & { open: boolean; mobile?: boolean }) {
  return <Dialog.Root open={props.open} onOpenChange={open => { if (!open) props.onClose() }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[80] bg-black/45" />
      <Dialog.Viewport className="fixed inset-0 z-[80] flex h-dvh items-center justify-center overflow-hidden px-[max(12px,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]">
        <Dialog.Popup aria-describedby={undefined} className={cn("flex max-h-full min-h-0 w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl", props.mobile && "max-w-[351px]")}>
          <PopupContent {...props} modal />
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  </Dialog.Root>
}

export function HomepagePopups() {
  const pathname = usePathname()
  const placement = pathname === "/" ? "home" : pathname === "/volunteer" ? "volunteer" : null
  // 경로별 수명으로 이전 페이지의 안내/닫기 상태가 다른 화면에 섞이지 않게 합니다.
  return placement ? <PopupSession key={pathname} placement={placement} /> : null
}

function PopupSession({ placement }: { placement: "home" | "volunteer" }) {
  const [popups, setPopups] = useState<HomepagePopup[]>([])
  const [hiddenUntil, setHiddenUntil] = useState<Record<string, number>>({})
  const [closed, setClosed] = useState(false)
  const [index, setIndex] = useState(0)
  const [now, setNow] = useState(0)
  useEffect(() => {
    let stopped = false
    let controller: AbortController | null = null
    async function refresh() {
      if (document.visibilityState === "hidden") return
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch(`/api/homepage-popups?placement=${placement}`, { cache: "no-store", signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        if (stopped || !Array.isArray(data.popups)) return
        const current = activePopups(data.popups, placement)
        const hidden: Record<string,number> = {}
        for (const popup of current) {
          try { hidden[popup.id] = Number(localStorage.getItem(popupStorageKey(popup.id))) || 0 } catch { /* 저장소 차단 시에도 닫기는 동작합니다. */ }
        }
        setPopups(current); setHiddenUntil(previous => ({ ...previous, ...hidden })); setNow(Date.now())
      } catch { /* 안내 조회 실패로 홈페이지나 신청을 막지 않습니다. */ }
    }
    function sync() { setNow(Date.now()); void refresh() }
    void refresh()
    const timer = window.setInterval(sync, 30000)
    document.addEventListener("visibilitychange", sync)
    window.addEventListener("storage", sync)
    return () => { stopped = true; controller?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", sync); window.removeEventListener("storage", sync) }
  }, [placement])
  useEffect(() => {
    const boundaries = popups.flatMap(p => [Date.parse(p.endsAt), hiddenUntil[p.id] ?? 0]).filter(time => time > now)
    if (!boundaries.length) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(2147483647, Math.max(1, Math.min(...boundaries) - Date.now())))
    return () => clearTimeout(timer)
  }, [popups, hiddenUntil, now])
  const available = activePopups(popups, placement, now).filter(p => (hiddenUntil[p.id] ?? 0) <= now)
  const visibleIndex = Math.min(index, Math.max(0, available.length - 1))
  const popup = available[visibleIndex]
  if (!popup || closed) return null
  function hideToday() {
    const until = nextKoreanMidnight()
    // 화면에 함께 묶인 안내 전체를 숨겨서 다음 팝업이 곧바로 다시 열리지 않게 합니다.
    for (const item of available) {
      try { localStorage.setItem(popupStorageKey(item.id), String(until)) } catch { /* 현재 방문에서는 닫힌 상태를 유지합니다. */ }
    }
    setClosed(true)
  }
  return <PopupDialog open popup={popup} index={visibleIndex} count={available.length} onNavigate={direction => setIndex(visibleIndex + direction)} onClose={() => setClosed(true)} onHideToday={hideToday} />
}
