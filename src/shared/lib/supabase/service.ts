/**
 * 서버 전용 Supabase 서비스 롤 클라이언트.
 * RLS 를 우회하므로 Server Component / Server Action 에서만 사용할 것.
 * 클라이언트 컴포넌트에서 절대 import 금지.
 */
import { createClient } from "@supabase/supabase-js"

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
