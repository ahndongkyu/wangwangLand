/**
 * 봉사 횟수에 따른 등급 시스템.
 * 25회 도달 = 정회원 자격 (왕왕랜드 지킴이 등급).
 */

export interface VolunteerTier {
  /** 등급 인덱스 (0부터) */
  level: number
  /** 등급 이름 */
  name: string
  /** 이모지 */
  icon: string
  /** 이 등급에 진입하기 위한 최소 봉사 횟수 */
  threshold: number
  /** 정회원 자격 등급 여부 */
  isFullMember?: boolean
}

export const VOLUNTEER_TIERS: VolunteerTier[] = [
  { level: 0, name: "새 얼굴",          icon: "", threshold: 0   },
  { level: 1, name: "산책 친구",        icon: "", threshold: 1   },
  { level: 2, name: "단골 봉사자",      icon: "", threshold: 3   },
  { level: 3, name: "든든한 동반자",    icon: "", threshold: 10  },
  { level: 4, name: "왕왕랜드 가족",    icon: "", threshold: 25, isFullMember: true },
  { level: 5, name: "베테랑 보호자",    icon: "", threshold: 50  },
  { level: 6, name: "명예 수호자",      icon: "", threshold: 100 },
]

/** 운영진(admin/staff) 여부 체크 — 운영진은 카운트 무관하게 최고 등급 */
function isStaffRole(role?: string | null): boolean {
  return role === "admin" || role === "staff"
}

/** 봉사 횟수에 해당하는 현재 등급. role이 admin/staff면 무조건 최고 등급. */
export function getTier(count: number, role?: string | null): VolunteerTier {
  if (isStaffRole(role)) {
    return VOLUNTEER_TIERS[VOLUNTEER_TIERS.length - 1]
  }
  // 가장 높은 threshold부터 검사
  for (let i = VOLUNTEER_TIERS.length - 1; i >= 0; i--) {
    if (count >= VOLUNTEER_TIERS[i].threshold) return VOLUNTEER_TIERS[i]
  }
  return VOLUNTEER_TIERS[0]
}

/** 다음 등급 (최고 등급이면 null). 운영진은 이미 최고라 항상 null. */
export function getNextTier(count: number, role?: string | null): VolunteerTier | null {
  if (isStaffRole(role)) return null
  const current = getTier(count, role)
  const next = VOLUNTEER_TIERS[current.level + 1]
  return next ?? null
}

/** 다음 등급까지 남은 횟수 (없으면 0) */
export function remainingToNextTier(count: number, role?: string | null): number {
  const next = getNextTier(count, role)
  if (!next) return 0
  return Math.max(0, next.threshold - count)
}

/** 진행률 0~100 (다음 등급까지). 운영진은 항상 100. */
export function progressToNextTier(count: number, role?: string | null): number {
  if (isStaffRole(role)) return 100
  const current = getTier(count, role)
  const next = getNextTier(count, role)
  if (!next) return 100
  const span = next.threshold - current.threshold
  if (span <= 0) return 100
  const done = count - current.threshold
  return Math.min(100, Math.max(0, Math.round((done / span) * 100)))
}

/** "어엿한 친구" 형식의 라벨 */
export function tierLabel(count: number, role?: string | null): string {
  const tier = getTier(count, role)
  return tier.name
}

/** 정회원 자격 도달 여부 */
export function hasFullMemberQualification(count: number, role?: string | null): boolean {
  const tier = getTier(count, role)
  return tier.level >= 4
}
