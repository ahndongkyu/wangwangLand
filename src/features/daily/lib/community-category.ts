export const COMMUNITY_TYPES = ["일상", "자유", "후기"] as const
export type CommunityType = (typeof COMMUNITY_TYPES)[number]

export function communityType(category: string | null | undefined): CommunityType {
  if (category === "자유" || category === "자유게시판" || category === "질문 및 답변") return "자유"
  if (category === "후기" || category === "봉사 후기" || category === "입양 후기") return "후기"
  return "일상"
}

export function communityFilter(value?: string): CommunityType | undefined {
  if (!value || value === "전체") return undefined
  return communityType(value)
}
