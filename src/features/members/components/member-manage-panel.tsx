"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  approveMember,
  rejectMember,
  updateMemberRole,
  toggleMemberBan,
} from "../api/actions"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { Profile } from "../api/queries"

const ROLE_LABEL: Record<Profile["role"], string> = {
  member: "일반회원",
  full_member: "정회원",
  staff: "운영진",
  admin: "관리자",
}

interface Props {
  profile: Profile
  /** profiles.role === 'admin' 인 본인이 운영진 관리 권한 보유 */
  isTopAdmin?: boolean
}

/**
 * 회원 상세 페이지에 들어가는 관리 액션 패널.
 * 리스트의 인라인 액션(MemberRowActions)와 달리 카드 형태로 한눈에 보이게 정렬.
 */
export function MemberManagePanel({ profile, isTopAdmin = false }: Props) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState<Profile["role"]>(profile.role)
  const [status, setStatus] = useState<Profile["status"]>(profile.status)
  const [isBanned, setIsBanned] = useState(profile.is_banned)
  const toast = useToast()
  const router = useRouter()

  function handleRoleChange(nextRole: Profile["role"]) {
    if (nextRole === role && status === "approved") return
    const prevRole = role
    const prevStatus = status
    setRole(nextRole)
    startTransition(async () => {
      const result =
        status === "approved"
          ? await updateMemberRole(profile.id, nextRole)
          : await approveMember(profile.id, nextRole)
      if (result.error) {
        toast.error(`실패: ${result.error}`)
        setRole(prevRole)
        setStatus(prevStatus)
      } else {
        if (status !== "approved") setStatus("approved")
        toast.success(`${ROLE_LABEL[nextRole]}으로 변경했습니다.`)
        router.refresh()
      }
    })
  }

  function handleBan(ban: boolean) {
    setIsBanned(ban)
    startTransition(async () => {
      const result = await toggleMemberBan(profile.id, ban)
      if (result.error) {
        toast.error(`실패: ${result.error}`)
        setIsBanned(!ban)
      } else {
        toast.success(ban ? "차단했습니다." : "차단을 해제했습니다.")
        router.refresh()
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectMember(profile.id)
      if (result.error) toast.error(`실패: ${result.error}`)
      else {
        setStatus("rejected")
        toast.success("거절했습니다.")
        router.refresh()
      }
    })
  }

  function handleReApprove() {
    startTransition(async () => {
      const result = await approveMember(profile.id, role)
      if (result.error) toast.error(`실패: ${result.error}`)
      else {
        setStatus("approved")
        toast.success("재승인했습니다.")
        router.refresh()
      }
    })
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {/* 권한 */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">권한</p>
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as Profile["role"])}
          disabled={pending || status === "rejected"}
          className={cn(
            "mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-medium",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          aria-label="권한"
        >
          <option value="member">일반회원</option>
          <option value="full_member">정회원</option>
          <option value="staff">운영진</option>
          {isTopAdmin && <option value="admin">관리자</option>}
        </select>
        {status === "rejected" && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            거절 상태입니다. 재승인 후 변경 가능합니다.
          </p>
        )}
      </div>

      {/* 상태 */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">가입 상태</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => handleRoleChange(role)}
                disabled={pending}
              >
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={pending}
              >
                거절
              </Button>
            </>
          )}
          {status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={pending}
            >
              거절로 변경
            </Button>
          )}
          {status === "rejected" && (
            <Button size="sm" onClick={handleReApprove} disabled={pending}>
              재승인
            </Button>
          )}
        </div>
      </div>

      {/* 차단 */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">접근 제어</p>
        <div className="mt-2">
          {status === "approved" ? (
            <Button
              size="sm"
              variant={isBanned ? "outline" : "destructive"}
              onClick={() => handleBan(!isBanned)}
              disabled={pending}
            >
              {isBanned ? "차단 해제" : "차단"}
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              승인된 회원만 차단할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
