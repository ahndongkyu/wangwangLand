// 점검 모드 완료 예정 시간 — ISO 문자열 → 한국어 표시 문자열
// "2026년 5월 22일 (목) 오후 5:00"
export function formatMaintenanceEta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""

  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  return fmt.format(d)
}

// ISO 문자열 → datetime-local input value (KST 기준 yyyy-MM-ddTHH:mm)
export function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  // KST 보정 (UTC+9)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 16) // yyyy-MM-ddTHH:mm
}

// datetime-local input value (KST 기준) → ISO 문자열 (UTC)
export function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  // datetime-local 은 timezone 정보가 없음. KST 로 가정하고 UTC 로 변환.
  const [date, time] = value.split("T")
  if (!date || !time) return null
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null
  // KST 시각을 UTC 로
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 9 * 60 * 60 * 1000
  return new Date(utcMs).toISOString()
}
