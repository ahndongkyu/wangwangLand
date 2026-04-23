import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/shared/lib/supabase/admin"

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=1", origin))
  }

  try {
    // 1. 카카오 토큰 교환
    const tokenRes = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/kakao/callback`,
        code,
      }),
    })

    if (!tokenRes.ok) {
      console.error("카카오 토큰 교환 실패", await tokenRes.text())
      return NextResponse.redirect(new URL("/login?error=1", origin))
    }

    const { access_token } = await tokenRes.json()

    // 2. 카카오 사용자 정보 조회
    const userRes = await fetch(KAKAO_USER_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userRes.ok) {
      console.error("카카오 사용자 정보 조회 실패", await userRes.text())
      return NextResponse.redirect(new URL("/login?error=1", origin))
    }

    const kakaoUser = await userRes.json()
    const kakaoId = String(kakaoUser.id)
    const kakaoNickname: string =
      kakaoUser.kakao_account?.profile?.nickname ?? ""
    const kakaoAvatar: string | null =
      kakaoUser.kakao_account?.profile?.profile_image_url ?? null

    // 3. Supabase 사용자 upsert (admin 클라이언트)
    const admin = createAdminClient()
    const fakeEmail = `kakao_${kakaoId}@kakao.wangwangland.internal`

    // 기존 사용자 확인
    const { data: existing } = await admin.auth.admin.listUsers()
    const existingUser = existing?.users?.find(
      (u) => u.email === fakeEmail
    )

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // 신규 사용자 생성
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: fakeEmail,
          email_confirm: true,
          user_metadata: {
            kakao_id: kakaoId,
            full_name: kakaoNickname,
            avatar_url: kakaoAvatar,
          },
        })

      if (createErr || !created.user) {
        console.error("사용자 생성 실패", createErr)
        return NextResponse.redirect(new URL("/login?error=1", origin))
      }

      userId = created.user.id
    }

    // 4. 매직링크로 세션 생성
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      })

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("링크 생성 실패", linkErr)
      return NextResponse.redirect(new URL("/login?error=1", origin))
    }

    // 5. 토큰을 세션으로 교환 (일반 클라이언트)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(list) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: linkData.properties.hashed_token,
    })

    if (verifyErr) {
      console.error("세션 교환 실패", verifyErr)
      return NextResponse.redirect(new URL("/login?error=1", origin))
    }

    // 6. 프로필 확인 → 리다이렉트
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname, status, is_banned")
      .eq("id", userId)
      .maybeSingle()

    // 밴된 유저 차단
    if (profile?.is_banned) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login?error=banned", origin))
    }

    if (!profile || profile.nickname === "새 회원") {
      // 신규 사용자면 카카오 닉네임을 기본값으로 프로필 업데이트
      if (kakaoNickname) {
        await supabase
          .from("profiles")
          .update({ avatar_url: kakaoAvatar })
          .eq("id", userId)
      }
      return NextResponse.redirect(new URL("/onboarding", origin))
    }

    if (profile.status === "pending") {
      return NextResponse.redirect(new URL("/pending", origin))
    }
    if (profile.status === "rejected") {
      return NextResponse.redirect(new URL("/rejected", origin))
    }

    return NextResponse.redirect(new URL("/", origin))
  } catch (err) {
    console.error("카카오 콜백 오류", err)
    return NextResponse.redirect(new URL("/login?error=1", origin))
  }
}
