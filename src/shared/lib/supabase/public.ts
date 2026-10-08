import "server-only"
import { createClient } from "@supabase/supabase-js"

/** 검색 엔진용 공개 데이터 조회. 로그인 쿠키와 서비스 역할 키를 사용하지 않는다. */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}
