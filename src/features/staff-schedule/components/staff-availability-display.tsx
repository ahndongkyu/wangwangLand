import type { StaffAvailabilityWithUser } from "../api/queries"

interface Props {
  items: StaffAvailabilityWithUser[]
  /** 운영진 메모 같이 보여줄지 (봉사자 화면에서는 true) */
  showNote?: boolean
}

function formatTime(time: string | null): string | null {
  if (!time) return null
  // HH:MM:SS → HH:MM
  return time.slice(0, 5)
}

/** 운영진 출근 정보를 일반 텍스트로 표시 — 봉사자/어드민 공통 사용 */
export function StaffAvailabilityDisplay({ items, showNote = true }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        해당 날짜에 출근 예정인 운영진이 아직 등록되지 않았어요.
      </p>
    )
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it) => {
        const start = formatTime(it.start_time)
        const end = formatTime(it.end_time)
        const timeLabel = start && end ? `${start} ~ ${end}` : start ? `${start} ~` : "종일"
        return (
          <li key={it.id} className="flex flex-col gap-0.5">
            <span>
              <span className="font-semibold text-foreground">
                {it.user?.nickname ?? "운영진"}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">{timeLabel}</span>
            </span>
            {showNote && it.note && (
              <span className="pl-1 text-xs text-muted-foreground">"{it.note}"</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
