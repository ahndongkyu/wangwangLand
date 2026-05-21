"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"

export async function setMaintenanceMode(enabled: boolean) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (auth.role !== "admin") return { error: "최고 관리자만 점검 모드를 변경할 수 있습니다." }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "maintenance_mode", value: enabled }, { onConflict: "key" })

  if (error) return { error: error.message }

  revalidatePath("/admin/settings")
  revalidatePath("/maintenance")
  return { ok: true }
}

export async function setMaintenanceMessage(message: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (auth.role !== "admin") return { error: "최고 관리자만 점검 안내 문구를 변경할 수 있습니다." }

  const trimmed = message.trim()
  if (trimmed.length > 500) {
    return { error: "안내 문구는 500자 이하로 입력해주세요." }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "maintenance_message", value: trimmed }, { onConflict: "key" })

  if (error) return { error: error.message }

  revalidatePath("/admin/settings")
  revalidatePath("/maintenance")
  return { ok: true }
}
