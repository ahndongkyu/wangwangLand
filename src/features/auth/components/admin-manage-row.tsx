"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import { removeAdmin, updateAdminRole } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import type { Admin, AdminRole } from "@/shared/types/database"

interface Props {
  admin: Admin
  /** 현재 로그인한 어드민 ID. 자기 자신은 UI 에서 제어 비활성화. */
  currentAdminId: string
}

const ROLE_LABEL: Record<AdminRole, string> = {
  admin: "최고관리자",
  editor: "관리자",
}

export function AdminManageRow({ admin, currentAdminId }: Props) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState<AdminRole>(admin.role)
  const [error, setError] = useState<string | null>(null)

  const isSelf = admin.id === currentAdminId

  function handleRoleChange(next: AdminRole) {
    if (next === role) return
    const prev = role
    setRole(next) // optimistic
    setError(null)
    startTransition(async () => {
      const result = await updateAdminRole(admin.id, next)
      if (result.error) {
        setError(result.error)
        setRole(prev) // rollback
      }
    })
  }

  function handleRemove() {
    if (
      !confirm(
        `${admin.name} (${admin.email}) 운영진을 제거할까요?\n` +
          `※ Supabase 계정 자체는 유지되며, 필요하면 대시보드에서 별도 삭제해주세요.`
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await removeAdmin(admin.id)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">
        {admin.name}
        {isSelf && (
          <span className="ml-1.5 text-xs text-muted-foreground">(나)</span>
        )}
      </td>
      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
        {admin.email}
      </td>
      <td className="px-4 py-3">
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
          disabled={pending || isSelf}
          className={cn(
            "h-8 rounded-md border border-input bg-background px-2 text-xs font-medium",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          aria-label={`${admin.name} 역할`}
        >
          <option value="admin">{ROLE_LABEL.admin}</option>
          <option value="editor">{ROLE_LABEL.editor}</option>
        </select>
      </td>
      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
        {new Date(admin.created_at).toLocaleDateString("ko-KR")}
      </td>
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
            aria-label="제거"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </td>
    </tr>
  )
}
