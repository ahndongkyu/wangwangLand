import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

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
    const kakaoNickname: string = kakaoUser.kakao_account?.profile?.nickname ?? ""
    const kakaoAvatar: string | null = kakaoUser.kakao_account?.profile?.profile_image_url ?? null

    // 3. Supabase 사용자 확인 (이메일로 직접 조회 — listUsers 페이징 버그 방지)
    const admin = createAdminClient()
    const fakeEmail = `kakao_${kakaoId}@kakao.wangwangland.internal`

    let userId: string
    let isNewUser = false

    const { data: existingUser } = await admin.auth.admin.getUserByEmail(fakeEmail)

    if (existingUser?.user) {
      userId = existingUser.user.id
    } else {
      isNewUser = true
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
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

    // 4. 매직링크로 세션 토큰 발급
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("링크 생성 실패", linkErr)
      return NextResponse.redirect(new URL("/login?error=1", origin))
    }

    // 5. verifyOtp 후 쿠키를 캡처해서 redirect 응답에 직접 붙임
    const cookiesToSet: Array<{ name: string; value: string; options: Partial<ResponseCookie> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll(list) {
            cookiesToSet.push(...list)
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

    // 6. 프로필 확인
    const { data: profile } = await admin
      .from("profiles")
      .select("nickname, status, is_banned")
      .eq("id", userId)
      .maybeSingle()

    // 리다이렉트 목적지 결정
    let redirectPath = "/"
    if (profile?.is_banned) {
      redirectPath = "/login?error=banned"
    } else if (isNewUser) {
      redirectPath = kakaoNickname
        ? `/onboarding?name=${encodeURIComponent(kakaoNickname)}`
        : "/onboarding"
    } else if (!profile || profile.status === "pending") {
      redirectPath = "/pending"
    } else if (profile.status === "rejected") {
      redirectPath = "/rejected"
    }

    // 7. 쿠키를 redirect 응답에 직접 붙여서 반환
    const response = NextResponse.redirect(new URL(redirectPath, origin))
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options })
    })

    return response
  } catch (err) {
    console.error("카카오 콜백 오류", err)
    return NextResponse.redirect(new URL("/login?error=1", origin))
  }
}
