"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { cancelMyPendingDonation } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"

export function DonationCancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()

  async function handleClick() {
    const ok = await confirm({
      title: "후원 등록을 취소할까요?",
      description: "검토중 상태에서만 본인이 취소할 수 있습니다.",
      confirmLabel: "취소",
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      const result = await cancelMyPendingDonation(id)
      if (result?.error) {
        toast.error(`취소 실패: ${result.error}`)
      } else {
        toast.success("등록을 취소했습니다.")
        router.refresh()
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      등록 취소
    </Button>
  )
}
