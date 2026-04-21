"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"

import { deleteDailyPost } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"

export function DailyDeleteButton({
  id,
  title,
}: {
  id: string
  title: string
}) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`'${title}' 일상을 정말 삭제할까요? 되돌릴 수 없습니다.`))
      return
    startTransition(async () => {
      const result = await deleteDailyPost(id)
      if (result?.error) alert(`삭제 실패: ${result.error}`)
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-label="삭제"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
