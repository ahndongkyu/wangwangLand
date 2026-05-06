"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"

export async function setMaintenanceMode(enabled: boolean) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "maintenance_mode", value: enabled }, { onConflict: "key" })

  if (error) return { error: error.message }

  revalidatePath("/admin/settings")
  return { ok: true }
}
