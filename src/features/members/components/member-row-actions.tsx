"use client"

import { useTransition, useRef, useEffect, useState } from "react"
import { MoreHorizontal, ChevronRight } from "lucide-react"
import { approveMember, rejectMember, updateMemberRole } from "../api/actions"
import { useToast } from "@/shared/components/toast"
import type { Profile } from "../api/queries"

export function MemberRowActions({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleApprove(role: Profile["role"]) {
    setOpen(false)
    startTransition(async () => {
      const result = await approveMember(profile.id, role)
      if (result.error) toast.error(`실패: ${result.error}`)
      else toast.success(`${ROLE_LABEL[role]}으로 승인했습니다.`)
    })
  }

  function handleReject() {
    setOpen(false)
    startTransition(async () => {
      const result = await rejectMember(profile.id)
      if (result.error) toast.error(`실패: ${result.error}`)
      else toast.success("거절했습니다.")
    })
  }

  function handleRole(role: Profile["role"]) {
    setOpen(false)
    startTransition(async () => {
      const result = await updateMemberRole(profile.id, role)
      if (result.error) toast.error(`실패: ${result.error}`)
      else toast.success(`${ROLE_LABEL[role]}으로 변경했습니다.`)
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        aria-label="작업 메뉴"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-[100] min-w-[180px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">

          {/* 대기 중 → 승인(권한 선택) + 거절 */}
          {profile.status === "pending" && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">승인 권한 선택</div>
              <button type="button" onClick={() => handleApprove("member")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary">
                ✅ <span>일반회원으로 승인</span>
              </button>
              <button type="button" onClick={() => handleApprove("full_member")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary">
                ✅ <span>정회원으로 승인</span>
              </button>
              <button type="button" onClick={() => handleApprove("staff")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary">
                ✅ <span>운영진으로 승인</span>
              </button>
              <div className="mx-2 my-1 border-t border-border" />
              <button type="button" onClick={handleReject}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                ❌ <span>거절</span>
              </button>
            </>
          )}

          {/* 승인된 회원 → 권한 변경 + 거절로 전환 */}
          {profile.status === "approved" && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">권한 변경</div>
              {profile.role !== "member" && (
                <button type="button" onClick={() => handleRole("member")}
                  className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary">
                  일반회원으로
                </button>
              )}
              {profile.role !== "full_member" && (
                <button type="button" onClick={() => handleRole("full_member")}
                  className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary">
                  정회원으로
                </button>
              )}
              {profile.role !== "staff" && (
                <button type="button" onClick={() => handleRole("staff")}
                  className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary">
                  운영진으로
                </button>
              )}
              <div className="mx-2 my-1 border-t border-border" />
              <button type="button" onClick={handleReject}
                className="flex w-full items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                ❌ 거절로 변경
              </button>
            </>
          )}

          {/* 거절된 회원 → 재승인 */}
          {profile.status === "rejected" && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">재승인</div>
              <button type="button" onClick={() => handleApprove("member")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary">
                ✅ <span>일반회원으로 승인</span>
              </button>
              <button type="button" onClick={() => handleApprove("full_member")}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary">
                ✅ <span>정회원으로 승인</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const ROLE_LABEL: Record<Profile["role"], string> = {
  member: "일반회원",
  full_member: "정회원",
  staff: "운영진",
}
