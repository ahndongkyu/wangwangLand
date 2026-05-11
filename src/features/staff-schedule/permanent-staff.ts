import type { StaffAvailabilityWithUser } from "./api/queries"

/**
 * 상시 출근 운영진 (회원 미등록).
 * 매번 일정 등록할 필요 없이 정해진 요일에 자동으로 캘린더·봉사폼·마이페이지에 노출됨.
 * 추가/제거하려면 이 배열만 수정.
 */
export interface PermanentStaffEntry {
  id: string
  name: string
  /** 0(일) ~ 6(토). 출근 요일. */
  weekdays: number[]
  /** 표시할 메모 (선택) */
  note: string | null
}

export const PERMANENT_STAFF: PermanentStaffEntry[] = [
  {
    id: "permanent-실장님",
    name: "실장님",
    weekdays: [1, 2, 3, 4, 5], // 월~금
    note: "평일 상주",
  },
]

/** PermanentStaff를 StaffAvailability 형식으로 어댑팅 — 기존 표시 컴포넌트 재사용 */
export function permanentToAvailability(
  entry: PermanentStaffEntry,
  date: string
): StaffAvailabilityWithUser {
  return {
    id: `${entry.id}-${date}`,
    user_id: entry.id,
    registered_by_id: null,
    date,
    start_time: null,
    end_time: null,
    note: entry.note,
    created_at: "",
    updated_at: "",
    user: { nickname: entry.name, role: "staff" },
    registered_by: null,
  }
}

/** YYYY-MM-DD 날짜 배열에서 해당 요일에 상주하는 운영진 매핑 반환 */
export function getPermanentStaffByDate(
  dates: string[]
): Record<string, StaffAvailabilityWithUser[]> {
  const result: Record<string, StaffAvailabilityWithUser[]> = {}
  for (const date of dates) {
    // KST 기준 요일 (UTC+9)
    const dt = new Date(`${date}T00:00:00+09:00`)
    const dow = dt.getUTCDay() // 입력이 KST 자정이라 UTC로 변환 후 day 추출하면 KST 요일
    const matches = PERMANENT_STAFF
      .filter((s) => s.weekdays.includes(dow))
      .map((s) => permanentToAvailability(s, date))
    result[date] = matches
  }
  return result
}

/** 시작일~종료일 기간에 상주하는 운영진을 날짜별로 반환 (월간 캘린더용) */
export function getPermanentStaffInRange(
  startDate: string,
  endDate: string
): StaffAvailabilityWithUser[] {
  const items: StaffAvailabilityWithUser[] = []
  const start = new Date(`${startDate}T00:00:00+09:00`)
  const end = new Date(`${endDate}T00:00:00+09:00`)
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getUTCDay()
    const y = cur.getUTCFullYear()
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0")
    const d = String(cur.getUTCDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${d}`
    for (const s of PERMANENT_STAFF) {
      if (s.weekdays.includes(dow)) {
        items.push(permanentToAvailability(s, dateStr))
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return items
}

/** ID가 PermanentStaff인지 판별 — 수정/삭제 버튼 숨기는 용도 */
export function isPermanentStaffId(userId: string): boolean {
  return PERMANENT_STAFF.some((s) => s.id === userId)
}
