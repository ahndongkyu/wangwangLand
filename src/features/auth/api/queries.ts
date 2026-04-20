import { createClient } from "@/shared/lib/supabase/server"
import type { Admin } from "@/shared/types/database"

export async function getCurrentAdmin(): Promise<Admin | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[getCurrentAdmin] error:", error)
    return null
  }

  return data as Admin | null
}
