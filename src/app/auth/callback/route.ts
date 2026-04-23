import { NextResponse } from "next/server"
import { createClient } from "@/shared/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const origin = url.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname, status")
          .eq("id", user.id)
          .maybeSingle()

        // 첫 로그인 또는 닉네임 미설정 → 온보딩
        if (!profile || profile.nickname === "새 회원") {
          return NextResponse.redirect(new URL("/onboarding", origin))
        }
        // 승인 대기
        if (profile.status === "pending") {
          return NextResponse.redirect(new URL("/pending", origin))
        }
        // 거절
        if (profile.status === "rejected") {
          return NextResponse.redirect(new URL("/rejected", origin))
        }
      }

      return NextResponse.redirect(new URL("/", origin))
    }
  }

  return NextResponse.redirect(new URL("/login?error=1", origin))
}
