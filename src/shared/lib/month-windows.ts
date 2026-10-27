/** 한국 시간 기준 월 경계. 서버의 로컬 시간대와 무관하게 계산한다. */
export function recentMonthWindows(months: number, now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return Array.from({ length: months }, (_, index) => {
    const start = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - months + 1 + index, 1))
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
    const month = start.toISOString().slice(0, 7)
    return {
      month,
      label: `${start.getUTCMonth() + 1}월`,
      from: new Date(start.getTime() - 9 * 60 * 60 * 1000).toISOString(),
      to: new Date(end.getTime() - 9 * 60 * 60 * 1000).toISOString(),
      firstDay: `${month}-01`,
      lastDay: new Date(end.getTime() - 1).toISOString().slice(0, 10),
    }
  })
}

/** 전월 1일부터 한국 시간의 같은 일·시각까지. 없는 날짜는 전월 말까지로 제한한다. */
export function previousMonthSameTimeWindow(now = new Date()) {
  const offset = 9 * 60 * 60 * 1000
  const kst = new Date(now.getTime() + offset)
  const year = kst.getUTCFullYear()
  const month = kst.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const until = kst.getUTCDate() > lastDay
    ? Date.UTC(year, month, 1) - offset - 1
    : Date.UTC(year, month - 1, kst.getUTCDate(), kst.getUTCHours(), kst.getUTCMinutes(), kst.getUTCSeconds(), kst.getUTCMilliseconds()) - offset
  return {
    from: new Date(Date.UTC(year, month - 1, 1) - offset).toISOString(),
    until: new Date(until).toISOString(),
    cappedAtMonthEnd: kst.getUTCDate() > lastDay,
  }
}
