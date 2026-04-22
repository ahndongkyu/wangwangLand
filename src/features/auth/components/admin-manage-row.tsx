"use client"

import { useRef, useState, useTransition } from "react"
import { Check, Pencil, Trash2, X } from "lucide-react"

import { removeAdmin, updateAdminName, updateAdminRole } from "../api/mutations"
import { useConfirm } from "@/shared/components/confirm-dialog"
import { useToast } from "@/shared/components/toast"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
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
  const [name, setName] = useState(admin.name)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(admin.name)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const toast = useToast()

  const isSelf = admin.id === currentAdminId

  function beginNameEdit() {
    setDraftName(name)
    setEditingName(true)
    // input mount 후 focus
    setTimeout(() => inputRef.current?.select(), 0)
  }
  function cancelNameEdit() {
    setEditingName(false)
    setDraftName(name)
    setError(null)
  }
  function commitNameEdit() {
    const trimmed = draftName.trim()
    if (trimmed === name) {
      setEditingName(false)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateAdminName(admin.id, trimmed)
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        setName(trimmed)
        setEditingName(false)
        toast.success("이름을 저장했습니다.")
      }
    })
  }

  function handleRoleChange(next: AdminRole) {
    if (next === role) return
    const prev = role
    setRole(next) // optimistic
    setError(null)
    startTransition(async () => {
      const result = await updateAdminRole(admin.id, next)
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        setRole(prev) // rollback
      } else {
        toast.success(`${admin.name} 역할을 변경했습니다.`)
      }
    })
  }

  async function handleRemove() {
    const ok = await confirm({
      title: `${admin.name} 운영진을 제거할까요?`,
      description: `${admin.email} 계정의 운영진 권한만 해제합니다. Supabase 계정 자체는 유지되며 필요하면 대시보드에서 별도 삭제해주세요.`,
      confirmLabel: "제거",
      danger: true,
    })
    if (!ok) return
    setError(null)
    startTransition(async () => {
      const result = await removeAdmin(admin.id)
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        toast.success(`${admin.name} 운영진을 제거했습니다.`)
      }
    })
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNameEdit()
                else if (e.key === "Escape") cancelNameEdit()
              }}
              disabled={pending}
              minLength={2}
              maxLength={50}
              className="h-8 text-sm"
              aria-label="이름"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={commitNameEdit}
              disabled={pending}
              aria-label="저장"
            >
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelNameEdit}
              disabled={pending}
              aria-label="취소"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{name}</span>
            {isSelf && (
              <span className="text-xs text-muted-foreground">(나)</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={beginNameEdit}
              disabled={pending}
              aria-label="이름 수정"
              className="size-7 p-0 opacity-60 hover:opacity-100"
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
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
