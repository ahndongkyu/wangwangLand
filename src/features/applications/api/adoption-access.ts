import "server-only"
import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import type { AdoptionRow } from "./queries"

export async function getAccessibleAdoption(id: string) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data: profile } = await client.from("profiles").select("role,is_banned,status").eq("id", user.id).maybeSingle()
  if (!profile || profile.is_banned || profile.status !== "approved") return null
  const staff = ["admin", "staff"].includes(profile.role)
  const db = createAdminClient()
  let query = db.from("adoption_applications").select("*, dog:dogs(id,name), cat:cats(id,name)").eq("id", id)
  if (!staff) query = query.eq("created_by", user.id)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error("입양상담 정보를 불러오지 못했습니다.", { cause: error })
  return data ? { application: data as AdoptionRow, staff } : null
}
