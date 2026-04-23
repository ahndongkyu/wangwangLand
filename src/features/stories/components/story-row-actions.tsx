"use client"

import Link from "next/link"
import { useTransition, useRef, useEffect, useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { deleteAdoptionStory } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"

export function StoryRowActions({
  id,
  title,
  canDelete = true,
}: {
  id: string
  title: string
  canDelete?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function handleDelete() {
    setOpen(false)
    const ok = await confirm({
      title: `'${title}' 후기를 삭제할까요?`,
      description: "되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      const result = await deleteAdoptionStory(id)
      if (result?.error) toast.error(`삭제 실패: ${result.error}`)
      else toast.success("입양 후기를 삭제했습니다.")
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        aria-label="작업 메뉴"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[120px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <Link
            href={`/admin/stories/${id}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <Pencil className="size-3.5" />
            수정
          </Link>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  )
}
