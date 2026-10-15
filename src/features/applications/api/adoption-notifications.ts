import "server-only"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { recordOperationError } from "@/features/operation-logs/server"
import { sendRecordedApplicationSms } from "@/features/sms"
import { buildAdoptionSms, adoptionSmsType, type AdoptionSmsKind } from "../lib/adoption-workflow"

/** DB가 상태 변경과 함께 만든 작업만 발송한다. 접수 API 재호출로 중복 전송하지 않는다. */
export async function dispatchAdoptionSms(id: string): Promise<string | undefined> {
  try {
    const db = createAdminClient()
    const { data: jobs, error } = await db.from("adoption_sms_jobs").update({ state: "dispatching" })
      .eq("application_id", id).eq("state", "pending").select("*")
    if (error) throw error
    const results = await Promise.all((jobs ?? []).map(async job => {
      try {
        const text = buildAdoptionSms(job.kind as AdoptionSmsKind, job.applicant_name, job.visit_at)
        const result = await sendRecordedApplicationSms(job.recipient_phone, text, job.actor_id, {
          applicationId: id, applicationType: "adoption", recipientName: job.kind === "received" || job.kind === "cancelled-staff" ? "입양담당팀장" : job.applicant_name,
          messageType: adoptionSmsType(text),
        })
        const saved = await db.from("adoption_sms_jobs").update({ state: result.ok ? "sent" : "failed" }).eq("id", job.id)
        if (saved.error) await recordOperationError("sms", "adoptionSmsResult", saved.error, "notification", { targetType: "adoption", targetId: id })
        return result.ok && !saved.error
      } catch (error) {
        // 한 수신자의 오류가 다른 수신자 발송을 막지 않으며, 불명확한 결과는 자동 재발송하지 않는다.
        await recordOperationError("sms", "adoptionSmsDispatch", error, "notification", { targetType: "adoption", targetId: id })
        return false
      }
    }))
    return results.some(ok => !ok) ? "신청 처리는 저장되었습니다. 일부 문자 발송 결과는 운영진 확인이 필요합니다." : undefined
  } catch (error) {
    await recordOperationError("sms", "adoptionSmsDispatch", error, "notification", { targetType: "adoption", targetId: id })
    return "신청 처리는 저장되었습니다. 문자 발송 결과는 운영진 확인이 필요합니다."
  }
}
