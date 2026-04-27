"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { approveDonation, rejectDonation, deleteDonation } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import type { DonationStatus } from "@/shared/types/database"

interface Props {
  id: string
  status: DonationStatus
}

export function DonationAdminActions({ id, status }: Props) {
  const [pending, startTransition] = useTransition()
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()

  function handleApprove() {
    startTransition(async () => {
      const r = await approveDonation(id)
      if (r?.error) toast.error(`승인 실패: ${r.error}`)
      else {
        toast.success("승인 완료")
        router.refresh()
      }
    })
  }

  async function handleReject() {
    const reason = prompt("반려 사유를 입력해주세요 (선택)") ?? ""
    const ok = await confirm({
      title: "이 후원 등록을 반려할까요?",
      confirmLabel: "반려",
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      const r = await rejectDonation(id, reason)
      if (r?.error) toast.error(`반려 실패: ${r.error}`)
      else {
        toast.success("반려 처리했습니다.")
        router.refresh()
      }
    })
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "이 후원 기록을 완전히 삭제할까요?",
      description: "되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      const r = await deleteDonation(id)
      if (r?.error) toast.error(`삭제 실패: ${r.error}`)
      else {
        toast.success("삭제했습니다.")
        router.push("/admin/donations")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" && (
        <>
          <Button onClick={handleApprove} disabled={pending}>
            승인
          </Button>
          <Button variant="outline" onClick={handleReject} disabled={pending}>
            반려
          </Button>
        </>
      )}
      {status === "rejected" && (
        <Button onClick={handleApprove} disabled={pending}>
          재승인
        </Button>
      )}
      <Button variant="destructive" onClick={handleDelete} disabled={pending}>
        삭제
      </Button>
    </div>
  )
}
