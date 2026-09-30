"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { deleteNotice } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import type { NoticeBoardType } from "@/shared/types/database"

export function NoticeDeleteButton({
  id,
  title,
  redirectTo,
  boardType = "notice",
}: {
  id: string
  title: string
  redirectTo?: string
  boardType?: NoticeBoardType
}) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()

  async function handleClick() {
    const ok = await confirm({
      title: `'${title}' ${boardType === "expense" ? "지출 내역을" : "공지를"} 삭제할까요?`,
      description: "되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      const result = await deleteNotice(id, boardType)
      if (result?.error) {
        toast.error(`삭제 실패: ${result.error}`)
      } else {
        toast.success(boardType === "expense" ? "지출 내역을 삭제했습니다." : "공지를 삭제했습니다.")
        if (redirectTo) router.push(redirectTo)
      }
    })
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      <Trash2 className="mr-1.5 size-4" />
      삭제
    </Button>
  )
}
