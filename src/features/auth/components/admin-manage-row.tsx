"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Trash2, User } from "lucide-react"

import { removeAdmin, updateAdminRole } from "../api/mutations"
import type { StaffRole } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { Profile } from "@/features/members/api/queries"

interface Props {
  profile: Profile
  currentProfileId: string
}

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "관리자",
  staff: "운영진",
}

export function AdminManageRow({ profile, currentProfileId }: Props) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState<StaffRole>(profile.role as StaffRole)
  const [error, setError] = useState<string | null>(null)
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
      }
    })
  }

  async function handleRemove() {
    const ok = await confirm({
      title: `${profile.nickname}을(를) 운영진에서 제거할까요?`,
      description: "해당 회원의 역할이 정회원으로 변경됩니다.",
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
      }
    })
  }

  return (
    <tr className="border-b border-border last:border-0">
      {/* 아바타 + 닉네임 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
            ) : (
              <User className="size-full p-1.5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{profile.nickname}</span>
            {isSelf && <span className="text-xs text-muted-foreground">(나)</span>}
          </div>
        </div>
      </td>

      {/* 역할 */}
      <td className="px-4 py-3">
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
          disabled={pending || isSelf}
          className={cn(
            "h-8 rounded-md border border-input bg-background px-2 text-xs font-medium",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          aria-label={`${profile.nickname} 역할`}
        >
          <option value="admin">{ROLE_LABEL.admin}</option>
          <option value="staff">{ROLE_LABEL.staff}</option>
        </select>
      </td>

      {/* 가입일 */}
      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
        {new Date(profile.created_at).toLocaleDateString("ko-KR")}
      </td>

      {/* 작업 */}
      <td className="px-4 py-3 text-right">
        {error && (
          <p className="mb-1 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {!isSelf && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={pending}
            aria-label="운영진 제거"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </td>
    </tr>
  )
}
