"use client"

import { useTransition, useRef, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { MoreHorizontal, User } from "lucide-react"

import { approveMember, rejectMember, updateMemberRole, toggleMemberBan } from "../api/actions"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"
import type { Profile } from "../api/queries"

const STATUS_LABEL: Record<Profile["status"], string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
}

const STATUS_COLOR: Record<Profile["status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
}

const ROLE_LABEL: Record<Profile["role"], string> = {
  member: "일반회원",
  full_member: "정회원",
  staff: "운영진",
  admin: "관리자",
}

export function MemberRowActions({
  profile,
  isTopAdmin = false,
  num,
}: {
  profile: Profile
  isTopAdmin?: boolean
  num?: number
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState<Profile["role"]>(profile.role)
  const [status, setStatus] = useState<Profile["status"]>(profile.status)
  const [isBanned, setIsBanned] = useState(profile.is_banned)
  const toast = useToast()
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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
      }
    })
  }

  function handleReject() {
    setOpen(false)
    startTransition(async () => {
      const result = await rejectMember(profile.id)
      if (result.error) toast.error(`실패: ${result.error}`)
      else {
        setStatus("rejected")
        toast.success("거절했습니다.")
      }
    })
  }

  function handleReApprove() {
    setOpen(false)
    const targetRole: Profile["role"] = role
    startTransition(async () => {
      const result = await approveMember(profile.id, targetRole)
      if (result.error) toast.error(`실패: ${result.error}`)
      else {
        setStatus("approved")
        toast.success(`${ROLE_LABEL[targetRole]}으로 재승인했습니다.`)
      }
    })
  }

  return (
    <tr className={cn("border-b border-border last:border-0", isBanned && "opacity-60")}>
      {/* 번호 */}
      {num !== undefined && (
        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
          {num}
        </td>
      )}
      {/* 닉네임 */}
      <td className="px-4 py-3">
        <Link
          href={`/admin/members/${profile.id}`}
          className="flex items-center gap-2.5 transition-colors hover:text-primary"
        >
          <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
            ) : (
              <User className="size-full p-1.5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{profile.nickname}</span>
            {isBanned && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                차단
              </span>
            )}
          </div>
        </Link>
      </td>

      {/* 상태 */}
      <td className="px-4 py-3">
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_COLOR[status])}>
          {STATUS_LABEL[status]}
        </span>
      </td>

      {/* 권한 */}
      <td className="hidden px-4 py-3 md:table-cell">
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as Profile["role"])}
          disabled={pending || status === "rejected"}
          className={cn(
            "h-8 rounded-md border border-input bg-background px-2 text-xs font-medium",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          aria-label={`${profile.nickname} 권한`}
        >
          <option value="member">일반회원</option>
          <option value="full_member">정회원</option>
          <option value="staff">운영진</option>
          {isTopAdmin && <option value="admin">관리자</option>}
        </select>
      </td>

      {/* 가입일 */}
      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
        {new Date(profile.created_at).toLocaleDateString("ko-KR")}
      </td>

      {/* 작업 */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* 차단 / 해제 버튼 */}
          {status === "approved" && (
            <button
              type="button"
              onClick={() => handleBan(!isBanned)}
              disabled={pending}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                isBanned
                  ? "bg-secondary text-foreground hover:bg-secondary/80"
                  : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              )}
            >
              {isBanned ? "해제" : "차단"}
            </button>
          )}

          {/* 더보기 */}
          <div ref={moreRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={pending}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              aria-label="더보기"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {open && (
              <div className="absolute right-0 top-9 z-[100] min-w-[160px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {/* 대기 중 */}
                {status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); handleRoleChange(role) }}
                      className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary"
                    >
                      승인
                    </button>
                    <div className="mx-2 my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={handleReject}
                      className="flex w-full items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      거절
                    </button>
                  </>
                )}

                {/* 승인됨 */}
                {status === "approved" && (
                  <button
                    type="button"
                    onClick={handleReject}
                    className="flex w-full items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    거절로 변경
                  </button>
                )}

                {/* 거절됨 */}
                {status === "rejected" && (
                  <button
                    type="button"
                    onClick={handleReApprove}
                    className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    재승인
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}
