/**
 * 권한 뱃지 — 디자인 시스템 색상 적용
 * member / staff / admin
 */

import { normalizeMemberRole, type MemberRole } from "@/shared/lib/member-role"
export type Role = MemberRole

interface BadgeStyle {
  bg: string
  color: string
}

const STYLES: Record<Role, BadgeStyle> = {
  member:      { bg: "#F1EFE8", color: "#5F5E5A" },
  staff:       { bg: "#FAECE7", color: "#993C1D" },
  admin:       { bg: "#FCEBEB", color: "#791F1F" },
}

const LABEL: Record<Role, string> = {
  member:      "회원",
  staff:       "운영진",
  admin:       "관리자",
}

interface Props {
  role: string
  className?: string
}

export function RoleBadge({ role, className = "" }: Props) {
  const key = normalizeMemberRole(role)
  const { bg, color } = STYLES[key]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${className}`}
      style={{ background: bg, color }}
    >
      {LABEL[key]}
    </span>
  )
}
