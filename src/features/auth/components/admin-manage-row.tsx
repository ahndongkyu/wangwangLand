"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { removeAdmin, updateAdminRole } from "../api/mutations"
import type { StaffRole } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import type { Profile } from "@/features/members/api/queries"

interface Props {
  profile: Profile
  currentProfileId: string
}

export function AdminManagePanel({ profile, currentProfileId }: Props) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState<StaffRole>(profile.role as StaffRole)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()

  const isSelf = profile.id === currentProfileId

  function handleRoleChange(next: StaffRole) {
    if (next === role) return
    const prev = role
    setRole(next)
    setError(null)
    startTransition(async () => {
      const result = await updateAdminRole(profile.id, next)
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        setRole(prev)
      } else {
        toast.success(`${profile.nickname} 역할을 변경했습니다.`)
        router.refresh()
      }
    })
  }

  async function handleRemove() {
    const ok = await confirm({
      title: `${profile.nickname}을(를) 운영진에서 제거할까요?`,
      description: "해당 회원의 역할이 회원으로 변경됩니다.",
      confirmLabel: "제거",
      danger: true,
    })
    if (!ok) return
    setError(null)
    startTransition(async () => {
      const result = await removeAdmin(profile.id)
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        toast.success(`${profile.nickname}을(를) 운영진에서 제거했습니다.`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="staff-role" className="text-sm text-muted-foreground">권한</label>
        <select id="staff-role" value={role} onChange={e => handleRoleChange(e.target.value as StaffRole)} disabled={pending || isSelf} className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60">
          <option value="admin">관리자</option><option value="staff">운영진</option>
        </select>
      </div>
      {isSelf ? <p className="text-sm text-muted-foreground">본인의 권한은 여기서 변경할 수 없습니다.</p> : <div><p className="mb-2 text-sm text-muted-foreground">운영진 해제 시 회원으로 변경됩니다.</p><Button variant="outline" className="min-h-11" onClick={handleRemove} disabled={pending}>운영진 해제</Button></div>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
