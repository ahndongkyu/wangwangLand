import { applicationDate } from "../lib/admin-list"

export function ApplicationScheduleTime({ date, time, timestamp = false, fallbackDate = "날짜 미입력" }: {
  date?: string
  time?: string | null
  timestamp?: boolean
  fallbackDate?: string
}) {
  const parsed = date ? new Date(date) : null
  const clock = timestamp && parsed && Number.isFinite(parsed.getTime())
    ? parsed.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })
    : time
  return <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm tabular-nums">
    <dt className="text-muted-foreground">날짜:</dt><dd className="min-w-0 font-medium">{date ? applicationDate(date).replace(/\s/g, "").replace(/\.$/, "") : fallbackDate}</dd>
    <dt className="text-muted-foreground">시간:</dt><dd className="min-w-0 font-medium">{clock || "시간 미입력"}</dd>
  </dl>
}
