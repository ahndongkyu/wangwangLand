export type MemberRole = "member" | "staff" | "admin"

/** 기존 DB의 full_member는 전환 SQL 적용 전에도 회원으로 취급한다. */
export function normalizeMemberRole(role: string | null | undefined): MemberRole {
  return role === "admin" || role === "staff" ? role : "member"
}

export function isAssignableMemberRole(role: unknown): role is MemberRole {
  return role === "member" || role === "staff" || role === "admin"
}

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  member: "회원",
  staff: "운영진",
  admin: "관리자",
}
