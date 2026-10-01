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
