import { cn } from "@/shared/lib/utils"

import { normalizeMemberRole, type MemberRole } from "@/shared/lib/member-role"
export type UserRole = MemberRole

interface Props {
  nickname: string
  role?: string | null
  /** 사이즈 */
  size?: "sm" | "md"
  className?: string
}

const ROLE_COLOR: Record<UserRole, string> = {
  member: "text-foreground/80",
  staff: "text-primary",
  admin: "text-primary",
}

/**
 * 작성자/회원 이름 표시 컴포넌트.
 * - 운영진 닉네임은 배경과 테두리 없이 강조색으로 표시합니다.
 */
export function UserName({
  nickname,
  role,
  size = "sm",
  className,
}: Props) {
  const key = normalizeMemberRole(role)
  const color = ROLE_COLOR[key]
  const fontSize = size === "md" ? "text-sm" : "text-xs"

  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center", className)}>
      <span className={cn("break-all font-semibold", fontSize, color)}>
        {nickname}
        {key !== "member" && <span className="sr-only"> ({key === "admin" ? "관리자" : "운영진"})</span>}
      </span>
    </span>
  )
}
