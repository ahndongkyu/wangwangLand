import { createAdminClient } from "@/shared/lib/supabase/admin"

export const DEFAULT_MAINTENANCE_MESSAGE =
  "왕왕랜드 홈페이지를 더 나은 서비스로 개선하기 위해\n일시적으로 점검 중입니다.\n잠시 후 다시 방문해 주세요 🙏"

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

export async function getMaintenanceConfig(): Promise<{
  enabled: boolean
  message: string
}> {
  const [enabled, message] = await Promise.all([
    getMaintenanceMode(),
    getMaintenanceMessage(),
  ])
  return { enabled, message }
}
