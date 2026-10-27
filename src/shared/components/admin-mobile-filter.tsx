"use client"

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const subscribe = (listener: () => void) => {
  const query = window.matchMedia("(max-width: 767px)")
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}

/** 데스크톱 필터는 그대로 두고 모바일에서는 별도 창으로 표시한다. */
export function AdminMobileFilter({ children, label = "상세 필터" }: { children: ReactNode; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  const query = useSearchParams().toString()
  useEffect(() => { dialog.current?.close() }, [pathname, query])
  const mobile = useSyncExternalStore(subscribe, () => window.matchMedia("(max-width: 767px)").matches, () => false)
  if (!mobile) return <>{children}</>
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="my-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm hover:bg-muted md:hidden">{label}</button>
    <dialog ref={dialog} aria-label={label} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/50">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-semibold">{label}</h2><button type="button" onClick={() => dialog.current?.close()} className="min-h-11 px-3 text-sm hover:text-primary">닫기</button></div>
      <div className="grid gap-3">{children}</div>
    </dialog>
  </>
}
