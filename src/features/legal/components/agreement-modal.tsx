"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

/**
 * 약관/개인정보 본문을 모달로 노출.
 * 약관 동의 화면에서 새 탭/페이지 이동 없이 본문을 검토할 수 있게 함.
 *  - ESC / 배경 클릭 / X 버튼으로 닫기
 *  - 열려 있을 때 body 스크롤 잠금
 */
export function AgreementModal({ open, onClose, title, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // body 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // 열릴 때 모달 상단으로 스크롤 리셋
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.scrollTop = 0
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agreement-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
    >
      {/* 배경 */}
      <button
        type="button"
        aria-label="모달 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* 컨텐츠 */}
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2
            id="agreement-modal-title"
            className="text-base font-semibold text-foreground md:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* 스크롤 본문 */}
        <div ref={dialogRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {children}
        </div>

        {/* 푸터 — 닫기 버튼 */}
        <footer className="border-t border-border px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  )
}
