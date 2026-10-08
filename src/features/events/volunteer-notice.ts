import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { buildVolunteerSms } from "@/features/applications/lib/volunteer-sms"
import { sendSms } from "@/features/sms"
import { sendPushToUser } from "@/features/push"

export interface VolunteerVisitSnapshot {
  id: string
  applicant_name: string
  phone: string | null
  party_size: number
  created_by: string | null
  starts: string[]
}

/** 변경 전에 조회 실패를 확인한다. 실패 시 일정을 먼저 저장하지 않는다. */
export async function snapshotVolunteerVisits(ids: string[]): Promise<VolunteerVisitSnapshot[]> {
  const admin = createAdminClient()
  const snapshots: VolunteerVisitSnapshot[] = []
  for (const id of new Set(ids)) {
    const { data: app, error } = await admin.from("volunteer_applications")
      .select("id, applicant_name, phone, party_size, created_by").eq("id", id).single()
    if (error || !app) throw new Error("봉사 신청 정보를 확인하지 못했습니다.")
    snapshots.push({ ...app, starts: await visitStarts(id) })
  }
  return snapshots
}

async function visitStarts(id: string): Promise<string[]> {
  const admin = createAdminClient()
  const starts: string[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from("events").select("starts_at")
      .eq("source_application_type", "volunteer").eq("source_application_id", id)
      .order("starts_at").order("id").range(offset, offset + 499)
    if (error) throw new Error("확정 봉사 일정을 확인하지 못했습니다.")
    for (const row of data ?? []) starts.push(new Date(row.starts_at).toISOString())
    if (!data || data.length < 500) return [...new Set(starts)].sort()
  }
}

export async function snapshotEventVisits(eventIds: string[]) {
  if (!eventIds.length) return []
  const { data, error } = await createAdminClient().from("events")
    .select("source_application_id").in("id", eventIds).eq("source_application_type", "volunteer")
  if (error) throw new Error("일정에 연결된 신청을 확인하지 못했습니다.")
  return snapshotVolunteerVisits((data ?? []).map(row => row.source_application_id).filter(Boolean))
}

/** 저장 성공 후 신청별 한 번만 알린다. 알림 실패는 저장 실패로 돌리지 않는다. */
export async function notifyVolunteerVisitChanges(before: VolunteerVisitSnapshot[], notifyInApp = false): Promise<string | undefined> {
  let warning: string | undefined
  for (const app of before) {
    try {
      const starts = await visitStarts(app.id)
      if (JSON.stringify(starts) === JSON.stringify(app.starts)) continue
      // 일부 날짜 삭제는 전체 취소가 아니라 남은 확정 일정 안내다.
      const kind = starts.length === 0 ? "cancelled" : app.starts.length === 0 ? "confirmed" : "rescheduled"
      const message = buildVolunteerSms(kind, app.applicant_name, starts, app.party_size)
      // 수정·삭제는 기존 일정 알림이 담당한다. 새 등록만 여기서 인앱/푸시를 보낸다.
      if (app.created_by && notifyInApp) {
        const { error } = await createAdminClient().from("notifications").insert({
          user_id: app.created_by, actor_id: null, post_type: "volunteer", post_id: app.id,
          type: kind === "cancelled" ? "application_cancelled" : kind === "confirmed" ? "application_approved" : "volunteer_reschedule_approved",
        })
        if (error) warning = "일정은 저장됐지만 일부 알림을 저장하지 못했습니다."
        try {
          await sendPushToUser({ title: "봉사 일정 안내", body: "확정 봉사 일정이 변경되었습니다. 신청 내역을 확인해주세요.", url: "/my/applications", tag: `volunteer-visit-${app.id}` }, app.created_by)
        } catch { warning = "일정은 저장됐지만 푸시 알림 전송을 확인하지 못했습니다." }
      }
      if (app.phone) {
        const text = kind === "cancelled" ? message.text.replace("사유를", "내역을") : message.text
        const result = await sendSms(app.phone, text, {
          applicationId: app.id, applicationType: "volunteer", recipientName: app.applicant_name, messageType: message.type,
        })
        if (!result.ok) warning = `일정은 저장됐습니다. ${result.error ?? "문자 결과를 발송 내역에서 확인해주세요."}`
      }
    } catch (error) {
      console.error("[notifyVolunteerVisitChanges]", error)
      warning = "일정은 저장됐지만 알림 결과를 확인하지 못했습니다. 재저장하지 말고 문자 발송 내역을 확인해주세요."
    }
  }
  return warning
}
