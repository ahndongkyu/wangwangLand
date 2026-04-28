import { createClient } from "@/shared/lib/supabase/server"
import type { Profile } from "@/features/members/api/queries"

/** staff 또는 admin role을 가진 유저만 반환. 권한 없으면 null. */
export async function getCurrentAdmin(): Promise<Profile | null> {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at")
    .eq("id", user.id)
    .in("role", ["staff", "admin"])
    .maybeSingle()

  if (error) {
    console.error("[getCurrentAdmin] error:", error)
    return null
  }

  return data as Profile | null
}
