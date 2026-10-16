import { createAdminClient } from "@/shared/lib/supabase/admin"

import { DEFAULT_MAINTENANCE_MESSAGE } from "../lib/defaults"
export { DEFAULT_MAINTENANCE_MESSAGE } from "../lib/defaults"

export async function getMaintenanceMode(): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .maybeSingle()
  return data?.value === true
}

export async function getMaintenanceMessage(): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "maintenance_message")
    .maybeSingle()
  const value = data?.value
  if (typeof value === "string" && value.trim().length > 0) return value
  return DEFAULT_MAINTENANCE_MESSAGE
}

export async function getMaintenanceEta(): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "maintenance_eta")
    .maybeSingle()
  const value = data?.value
  if (typeof value === "string" && value.trim().length > 0) return value
  return null
}

export async function getMaintenanceConfig(): Promise<{
  enabled: boolean
  message: string
  eta: string | null
}> {
  const [enabled, message, eta] = await Promise.all([
    getMaintenanceMode(),
    getMaintenanceMessage(),
    getMaintenanceEta(),
  ])
  return { enabled, message, eta }
}
