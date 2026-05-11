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
  { level: 0, name: "예비 친구",        icon: "🥚", threshold: 0   },
  { level: 1, name: "새싹 친구",        icon: "🌱", threshold: 1   },
  { level: 2, name: "새내기 친구",      icon: "🐣", threshold: 3   },
  { level: 3, name: "어엿한 친구",      icon: "🐶", threshold: 10  },
  { level: 4, name: "왕왕랜드 지킴이",  icon: "🏠", threshold: 25, isFullMember: true },
  { level: 5, name: "베테랑 지킴이",    icon: "🐕‍🦺", threshold: 50  },
  { level: 6, name: "명예 지킴이",      icon: "👑", threshold: 100 },
]

/** 봉사 횟수에 해당하는 현재 등급 */
export function getTier(count: number): VolunteerTier {
  // 가장 높은 threshold부터 검사
  for (let i = VOLUNTEER_TIERS.length - 1; i >= 0; i--) {
    if (count >= VOLUNTEER_TIERS[i].threshold) return VOLUNTEER_TIERS[i]
  }
  return VOLUNTEER_TIERS[0]
}

/** 다음 등급 (최고 등급이면 null) */
export function getNextTier(count: number): VolunteerTier | null {
  const current = getTier(count)
  const next = VOLUNTEER_TIERS[current.level + 1]
  return next ?? null
}

/** 다음 등급까지 남은 횟수 (없으면 0) */
export function remainingToNextTier(count: number): number {
  const next = getNextTier(count)
  if (!next) return 0
  return Math.max(0, next.threshold - count)
}

/** 진행률 0~100 (다음 등급까지) */
export function progressToNextTier(count: number): number {
  const current = getTier(count)
  const next = getNextTier(count)
  if (!next) return 100
  const span = next.threshold - current.threshold
  if (span <= 0) return 100
  const done = count - current.threshold
  return Math.min(100, Math.max(0, Math.round((done / span) * 100)))
}

/** "🐶 어엿한 친구" 형식의 라벨 */
export function tierLabel(count: number): string {
  const tier = getTier(count)
  return `${tier.icon} ${tier.name}`
}

/** 정회원 자격 도달 여부 */
export function hasFullMemberQualification(count: number): boolean {
  const tier = getTier(count)
  return tier.level >= 4
}
