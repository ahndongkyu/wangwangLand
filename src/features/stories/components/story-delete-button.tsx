"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"

import { deleteAdoptionStory } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"

export function StoryDeleteButton({
  id,
  title,
}: {
  id: string
  title: string
}) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()

  async function handleClick() {
    const ok = await confirm({
      title: `'${title}' 입양 후기를 삭제할까요?`,
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
