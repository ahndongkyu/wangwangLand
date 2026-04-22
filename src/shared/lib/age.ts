// 강아지·고양이 나이 계산/포맷 유틸.
// 우선순위: birth_date > age_months(fallback).

/** YYYY-MM-DD → 오늘 기준 총 개월수. 유효하지 않으면 0. */
export function ageMonthsFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return 0
  const now = new Date()
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

/** 개월수를 "Y살 M개월" / "M개월" 등 한글 텍스트로. */
export function formatAgeMonths(months: number | null | undefined): string {
  if (months == null) return "나이 미상"
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years}살` : `${years}살 ${rem}개월`
}

/**
 * 주어진 동물의 나이를 텍스트로 반환.
 * birth_date 있으면 오늘 기준으로 계산, 없으면 age_months 직접 사용.
 */
export function formatAge(animal: {
  birth_date?: string | null
  age_months?: number | null
}): string {
  if (animal.birth_date) {
    return formatAgeMonths(ageMonthsFromBirthDate(animal.birth_date))
  }
  return formatAgeMonths(animal.age_months ?? null)
}
