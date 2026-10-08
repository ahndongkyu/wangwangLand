"use server"

import { revalidatePath } from "next/cache"
import { requireTopAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { logStatuses, type LogStatus } from "./catalog"

export async function updateLogStatus(id: string, status: LogStatus, lastSeen: string) {
  const auth = await requireTopAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Object.hasOwn(logStatuses, status) || !Number.isFinite(Date.parse(lastSeen))) return { error: "변경할 오류 정보를 확인해주세요." }
  try {
    const { data, error } = await createAdminClient().from("operation_error_logs")
      .update({ status, status_changed_at: new Date().toISOString() })
      .eq("id", id).eq("last_seen_at", lastSeen).select("id").maybeSingle()
    if (error) return { error: "상태를 저장하지 못했습니다. 다시 시도해주세요." }
    if (!data) return { error: "새 오류가 추가되었거나 기록이 변경되었습니다. 새로고침 후 확인해주세요." }
    revalidatePath("/admin/logs")
    return { ok: true }
  } catch {
    return { error: "상태를 저장하지 못했습니다. 다시 시도해주세요." }
  }
}
