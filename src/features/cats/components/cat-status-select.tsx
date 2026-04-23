"use client"

import { useTransition } from "react"

import { updateCatStatus } from "../api/mutations"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"
import type { DogStatus } from "@/shared/types/database"

const STATUS_OPTIONS: DogStatus[] = ["보호중", "임시보호중", "입양완료", "무지개다리"]

const STATUS_COLORS: Record<DogStatus, string> = {
  보호중: "bg-primary/15 text-primary",
  임시보호중: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  입양완료: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  무지개다리: "bg-muted text-muted-foreground",
}

export function CatStatusSelect({
  id,
  status,
}: {
  id: string
  status: DogStatus
}) {
  const [pending, startTransition] = useTransition()
  const toast = useToast()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as DogStatus
    if (next === status) return
    startTransition(async () => {
      const result = await updateCatStatus(id, next)
      if (result?.error) toast.error(`상태 변경 실패: ${result.error}`)
      else toast.success(`상태를 '${next}'으로 변경했습니다.`)
    })
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={pending}
      className={cn(
        "cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold outline-none ring-0",
        "appearance-none pr-5 bg-[length:12px_12px] bg-no-repeat bg-[right_4px_center]",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='currentColor' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")]",
        "transition-opacity",
        STATUS_COLORS[status],
        pending && "opacity-50"
      )}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}
