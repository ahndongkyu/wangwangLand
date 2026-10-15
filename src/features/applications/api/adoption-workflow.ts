"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { recordOperationError } from "@/features/operation-logs/server"
import { dispatchAdoptionSms } from "./adoption-notifications"

export async function processAdoption(id: string, form: FormData) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const action = String(form.get("action") ?? "")
  if (!["approve", "reject", "complete"].includes(action)) return { error: "처리 방법을 확인해주세요." }
  const expected = String(form.get("expected_updated_at") ?? "")
  if (!expected || !Number.isFinite(Date.parse(expected))) return { error: "새로고침 후 다시 처리해주세요." }
  const date = String(form.get("visit_date") ?? "")
  const time = String(form.get("visit_time") ?? "")
  if (action === "approve" && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(Date.parse(`${date}T${time}:00+09:00`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date)) return { error: "방문 날짜와 시간을 확인해주세요." }
  if (String(form.get("reason") ?? "").length > 2000) return { error: "사유는 2,000자 이내로 입력해주세요." }
  if (String(form.get("adopter_name") ?? "").length > 100) return { error: "입양자 이름은 100자 이내로 입력해주세요." }
  const client = await createClient()
  const { error } = await client.rpc("process_adoption_consultation", {
    p_id: id, p_expected_updated_at: expected, p_action: action,
    p_visit_at: action === "approve" ? new Date(`${date}T${time}:00+09:00`).toISOString() : null,
    p_reason: String(form.get("reason") ?? "").trim() || null,
    p_animal_kind: String(form.get("animal_kind") ?? "") || null,
    p_animal_id: String(form.get("animal_id") ?? "") || null,
    p_adoption_date: String(form.get("adoption_date") ?? "") || null,
    p_adopter_name: String(form.get("adopter_name") ?? "").trim() || null,
    p_adopter_phone: String(form.get("adopter_phone") ?? "").replace(/\D/g, "") || null,
  })
  if (error) {
    await recordOperationError("application", "processAdoption", error, "application")
    return { error: error.message }
  }
  const warning = await dispatchAdoptionSms(id)
  if (action === "reject") {
    try {
      const db = createAdminClient()
      const { data: app } = await db.from("adoption_applications").select("created_by").eq("id", id).single()
      if (app?.created_by) {
        const { error: noticeError } = await db.from("notifications").insert({ user_id: app.created_by, type: "application_rejected", post_type: "adoption", post_id: id, actor_id: auth.userId })
        if (noticeError) throw noticeError
        const { sendPushToUser } = await import("@/features/push")
        await sendPushToUser({ title: "입양상담 신청 거절", body: "신청 내역에서 사유를 확인해주세요.", url: `/my/applications/adoption/${id}`, tag: `adoption-rejected-${id}` }, app.created_by)
      }
    } catch (error) { await recordOperationError("push", "adoptionRejectionNotice", error, "notification") }
  }
  for (const path of ["/admin/applications", `/admin/applications/adoption/${id}`, "/my/applications", `/my/applications/adoption/${id}`, "/", "/dogs", "/cats", "/about"]) revalidatePath(path)
  return { id, warning }
}
