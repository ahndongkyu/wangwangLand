/**
 * 권한 뱃지 — 디자인 시스템 색상 적용
 * member / full_member / staff / admin
 */

export type Role = "member" | "full_member" | "staff" | "admin"

interface BadgeStyle {
  bg: string
  color: string
}

const STYLES: Record<Role, BadgeStyle> = {
  member:      { bg: "#F1EFE8", color: "#5F5E5A" },
  full_member: { bg: "#FAEEDA", color: "#BA7517" },
  staff:       { bg: "#FAECE7", color: "#993C1D" },
  admin:       { bg: "#FCEBEB", color: "#791F1F" },
}

const LABEL: Record<Role, string> = {
  member:      "일반회원",
  full_member: "정회원",
  staff:       "운영진",
  admin:       "관리자",
}

interface Props {
  role: string
  className?: string
}

export function RoleBadge({ role, className = "" }: Props) {
  const key = (role in STYLES ? role : "member") as Role
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
