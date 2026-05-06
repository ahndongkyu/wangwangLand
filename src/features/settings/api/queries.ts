import { createAdminClient } from "@/shared/lib/supabase/admin"

export async function getMaintenanceMode(): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .maybeSingle()
  return data?.value === true
}
