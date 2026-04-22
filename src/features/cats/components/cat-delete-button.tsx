"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"

import { deleteCat } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"

export function CatDeleteButton({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()

  async function handleClick() {
    const ok = await confirm({
      title: `'${name}' 정보를 삭제할까요?`,
      description: "되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      const result = await deleteCat(id)
      if (result?.error) toast.error(`삭제 실패: ${result.error}`)
      else toast.success(`'${name}' 을(를) 삭제했습니다.`)
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-label={`${name} 삭제`}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
