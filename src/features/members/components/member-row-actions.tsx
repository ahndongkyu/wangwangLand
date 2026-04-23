"use client"

import { useTransition, useRef, useEffect, useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { updateMemberStatus, updateMemberRole } from "../api/actions"
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

  function handleStatus(status: "approved" | "rejected") {
    setOpen(false)
    startTransition(async () => {
      const result = await updateMemberStatus(profile.id, status)
      if (result.error) toast.error(`실패: ${result.error}`)
      else toast.success(status === "approved" ? "승인했습니다." : "거절했습니다.")
    })
  }

  function handleRole(role: Profile["role"]) {
    setOpen(false)
    startTransition(async () => {
      const result = await updateMemberRole(profile.id, role)
      if (result.error) toast.error(`실패: ${result.error}`)
      else toast.success("권한을 변경했습니다.")
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
        <div className="absolute right-0 top-9 z-50 min-w-[160px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {/* 승인/거절 */}
          {profile.status !== "approved" && (
            <button
              type="button"
              onClick={() => handleStatus("approved")}
              className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              ✅ 승인
            </button>
          )}
          {profile.status !== "rejected" && (
            <button
              type="button"
              onClick={() => handleStatus("rejected")}
              className="flex w-full items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              ❌ 거절
            </button>
          )}

          {/* 권한 변경 */}
          {profile.status === "approved" && (
            <>
              <div className="mx-2 my-1 border-t border-border" />
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
