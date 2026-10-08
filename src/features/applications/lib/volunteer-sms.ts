export type VolunteerSmsKind = "confirmed" | "rescheduled" | "cancelled"

export function volunteerSmsKind(previous: string, next: string, createdSchedules: number, hadConfirmedSchedule: boolean, rejectReschedule: boolean): VolunteerSmsKind | null {
  if (next === "취소" && previous !== "취소" && hadConfirmedSchedule) return "cancelled"
  if (next !== "승인" || rejectReschedule || createdSchedules < 1) return null
  return previous === "일정변경요청" ? "rescheduled" : "confirmed"
}

export function buildVolunteerSms(kind: VolunteerSmsKind, name: string, starts: string[], partySize: number) {
  if (kind === "cancelled") return {
    type: "SMS" as const,
    text: "[왕왕랜드]\n예정된 봉사가 취소되었습니다.\n마이페이지에서 사유를 확인해 주세요.",
  }
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"]
  const visits = [...new Set(starts)].sort().map(start => {
    const local = new Date(new Date(start).getTime() + 9 * 60 * 60 * 1000)
    return `${local.toISOString().slice(0, 10).replaceAll("-", ".")}(${weekdays[local.getUTCDay()]}) ${local.toISOString().slice(11, 16)}`
  })
  if (!visits.length) throw new Error("확정 일정이 없는 승인 문자는 발송할 수 없습니다.")
  return {
    type: "LMS" as const,
    text: `[왕왕랜드 봉사 안내]\n${name}님, ${kind === "rescheduled" ? "봉사 일정 변경이 확정되었습니다.\n기존 일정 대신 아래 일정으로 방문해 주세요." : "봉사 신청이 승인되었습니다."}\n\n방문 일정: ${visits.join("\n")}\n참여 인원: ${partySize}명\n\n준비물과 신청 내역은 마이페이지에서 확인해 주세요.\n일정 변경이나 취소도 마이페이지에서 요청하실 수 있습니다.\n\n신청 내역 확인\nhttps://wangwangland.kr/my/applications`,
  }
}
