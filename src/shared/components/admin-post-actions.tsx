"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
  editHref: string
  /** 서버 액션. bound ID를 포함해서 넘겨야 함: deleteNotice.bind(null, id) */
  deleteAction: () => Promise<{ error?: string } | undefined>
  /** 삭제 확인 메시지에 쓸 단위 레이블 (예: "공지", "일상", "후기") */
  label?: string
}

/**
 * 어드민 게시글 목록에서 각 행 우측에 표시하는 빠른 액션 버튼 (⋮).
 * 탭하면 "편집" / "삭제" 팝오버 표시.
 * 서버 컴포넌트 부모에서 `deleteAction={deleteXxx.bind(null, id)}` 형태로 넘길 것.
 */
export function AdminPostActions({ editHref, deleteAction, label = "항목" }: Props) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, startDelete] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  // 바깥 클릭 / 터치 시 닫기
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler as EventListener, { passive: true })
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler as EventListener)
    }
  }, [open])

  function toggle(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!open) setConfirming(false)
    setOpen((v) => !v)
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startDelete(async () => {
      const result = await deleteAction()
      if (result?.error) {
        alert(result.error)
        return
      }
      setOpen(false)
      window.location.reload()
    })
  }

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          open
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
        aria-label="더보기"
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[130px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {/* 편집 */}
          <a
            href={editHref}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <Pencil className="size-4 text-muted-foreground" />
            편집
          </a>
          <div className="h-px bg-border" />
          {/* 삭제 */}
          {!confirming ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              삭제
            </button>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground">이 {label}를 삭제할까요?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="text-xs font-bold text-destructive hover:underline disabled:opacity-50"
                >
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
