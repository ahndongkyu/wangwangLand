"use server"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { recordOperationError } from "@/features/operation-logs/server"
import { OPERATING_KEYS, validateOperatingInfo, type OperatingGroup } from "../lib/operating-info"

export async function saveOperatingInfo(group: OperatingGroup, raw: unknown, expectedRevision: string | null) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!Object.hasOwn(OPERATING_KEYS, group)) return { error: "잘못된 설정 항목입니다." }
  const data = validateOperatingInfo(group, raw)
  if (!data || (expectedRevision !== null && (typeof expectedRevision !== "string" || expectedRevision.length > 100))) return { error: "필수 항목, 연락처, 공식 채널 주소를 확인해 주세요." }
  const revision = randomUUID()
  const value = { data, revision, updatedAt: new Date().toISOString(), updatedBy: auth.userId }
  try {
    const db = createAdminClient()
    const query = expectedRevision === null
      ? db.from("app_settings").insert({ key: OPERATING_KEYS[group], value })
      : db.from("app_settings").update({ value }).eq("key", OPERATING_KEYS[group]).eq("value->>revision", expectedRevision)
    const saved = await query.select("key")
    if (saved.error || saved.data?.length !== 1) {
      if (saved.error && saved.error.code !== "23505") await recordOperationError("query", "saveOperatingInfo", saved.error, "admin")
      return { error: "저장하지 못했습니다. 다른 운영진의 변경 여부를 확인하도록 새로고침 후 다시 시도해 주세요." }
    }
    revalidatePath("/", "layout")
    return { data, revision, updatedAt: value.updatedAt }
  } catch (error) {
    await recordOperationError("query", "saveOperatingInfo", error, "admin")
    return { error: "저장 결과를 확인하지 못했습니다. 새로고침 후 확인해 주세요." }
  }
}
