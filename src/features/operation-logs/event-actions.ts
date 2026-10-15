"use server"

import { requireTopAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { validId } from "./diagnostics"
import type { EventResult, OperationEvent } from "./event-types"

export async function getErrorEvents(logId: string, page = 1): Promise<EventResult> {
  const auth = await requireTopAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!validId(logId) || !Number.isInteger(page) || page < 1 || page > 10000) return { error: "조회할 오류 기록을 확인해주세요." }
  try {
    const db = createAdminClient()
    const { data, error } = await db.from("operation_error_events")
      .select("id,occurred_at,actor_id,actor_role,page,target_type,target_id,action,description,location,browser,device,release,trace_id,source")
      .eq("log_id", logId).gte("occurred_at", new Date(Date.now() - 90 * 86400000).toISOString())
      .order("occurred_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 10, page * 10)
    if (error) return { error: "발생 기록을 불러오지 못했습니다. 개별 오류 기록 SQL 적용 여부와 DB 연결을 확인해주세요." }
    const rows = (data ?? []).slice(0, 10) as Omit<OperationEvent, "nickname">[]
    const ids = [...new Set(rows.flatMap(row => row.actor_id ? [row.actor_id] : []))]
    const names = new Map<string, string>()
    if (ids.length) {
      const profiles = await db.from("profiles").select("id,nickname").in("id", ids)
      // 이름 조회 실패 시에도 내부 ID로 추적할 수 있다. 탈퇴 회원을 임의 회원으로 표시하지 않는다.
      for (const profile of profiles.data ?? []) names.set(profile.id, profile.nickname)
    }
    return { events: rows.map(row => ({ ...row, nickname: row.actor_id ? names.get(row.actor_id) ?? null : null })), hasMore: (data?.length ?? 0) > 10 }
  } catch { return { error: "발생 기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." } }
}
