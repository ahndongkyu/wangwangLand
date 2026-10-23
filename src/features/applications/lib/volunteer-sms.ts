export type VolunteerSmsKind = "confirmed" | "rescheduled" | "cancelled"
export type VolunteerSmsMode = "short" | "full" | "none"
export type VolunteerSmsRecommendation = { mode: "short" | "full"; previousSubmittedAt?: string; failed?: boolean }

export async function getVolunteerSmsRecommendation(
  admin: ReturnType<typeof import("@/shared/lib/supabase/admin").createAdminClient>,
  app: { id: string; created_by: string | null; submitted_at: string },
): Promise<VolunteerSmsRecommendation> {
  if (!app.created_by) return { mode: "full" }
  try {
    const end = new Date(app.submitted_at)
    if (!Number.isFinite(end.getTime())) return { mode: "full", failed: true }
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data, error } = await admin.from("volunteer_applications")
      .select("submitted_at").eq("created_by", app.created_by).eq("status", "승인")
      .neq("id", app.id).gte("submitted_at", start.toISOString()).lt("submitted_at", end.toISOString())
      .order("submitted_at", { ascending: false }).limit(1).maybeSingle()
    if (error) return { mode: "full", failed: true }
    return data ? { mode: "short", previousSubmittedAt: data.submitted_at } : { mode: "full" }
  } catch { return { mode: "full", failed: true } }
}

export function buildShortVolunteerSms(name: string, starts: string[]) {
  const full = buildVolunteerSms("confirmed", name, starts, 1)
  const dates = full.text.split("방문 일정: ")[1].split("\n참여 인원:")[0]
    .replace(/20(\d{2})\.(\d{2})\.(\d{2})\([^)]+\)/g, "$1.$2.$3")
  const text = `[왕왕랜드]\n${name}님, 봉사 신청이 승인되었습니다.\n방문: ${dates}`
  const bytes = [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 127 ? 2 : 1), 0)
  return { text, type: bytes <= 90 ? "SMS" as const : "LMS" as const }
}

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
  if (kind === "rescheduled") return {
    type: "LMS" as const,
    text: `${name}님, 봉사 일정 변경이 확정되었습니다.\n변경일자: ${visits.join("\n")}`,
  }
  return {
    type: "LMS" as const,
    text: `[왕왕랜드 봉사 안내]\n${name}님, 봉사 신청이 승인되었습니다.\n\n방문 일정: ${visits.join("\n")}\n참여 인원: ${partySize}명\n\n준비물·신청 내역 확인과 일정 변경·취소 요청은 홈페이지에서 가능합니다.\nhttps://wangwangland.kr/my/applications\n\n그 외 문의는 카카오톡 채널로 부탁드립니다.\nhttp://pf.kakao.com/_iTmxbX/chat`,
  }
}
