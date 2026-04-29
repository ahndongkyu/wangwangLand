"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { deleteDonationThanks } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"

export function ThanksDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()

  async function handleDelete() {
    const res = await confirm({
      title: "감사글을 삭제할까요?",
      description: "삭제하면 복구할 수 없습니다.",
      confirmText: "삭제",
      danger: true,
    })
    if (!res) return
    startTransition(async () => {
      const result = await deleteDonationThanks(id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success("삭제되었습니다")
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  )
}
