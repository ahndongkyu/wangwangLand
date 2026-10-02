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

const ROLE_BORDER: Record<UserRole, string> = {
  member:      "border-border text-foreground/80",
  staff:       "border-amber-500/70 text-amber-700 dark:text-amber-400",
  admin:       "border-red-500/70 text-red-700 dark:text-red-400",
}

/**
 * 작성자/회원 이름 표시 컴포넌트.
 * - 권한(role) → 닉네임 둘레 테두리 색
 */
export function UserName({
  nickname,
  role,
  size = "sm",
  className,
}: Props) {
  const key = normalizeMemberRole(role)
  const border = ROLE_BORDER[key]
  const padding = size === "md" ? "px-2.5 py-0.5 text-sm" : "px-2 py-[1px] text-xs"

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("inline-flex items-center rounded-full border font-semibold", padding, border)}>
        {nickname}
      </span>
    </span>
  )
}
