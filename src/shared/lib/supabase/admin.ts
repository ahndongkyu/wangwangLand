import { createClient } from "@supabase/supabase-js"

/** RLS를 우회하는 서버 전용 admin 클라이언트 — 절대 클라이언트에 노출 금지 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
