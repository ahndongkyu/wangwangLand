import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me"
const MAX_NICKNAME_LENGTH = 20

type AdminClient = ReturnType<typeof createAdminClient>

async function findUserIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
  let page = 1

  while (true) {
    const { data: { users }, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const match = users.find((user) => user.email === email)
    if (match) return match.id
    if (users.length < 1000) return null

    page++
  }
}

async function getAvailableNickname(admin: AdminClient, requestedNickname: string): Promise<string> {
  const baseNickname = requestedNickname.trim() || "카카오회원"
  const { data, error } = await admin.from("profiles").select("nickname")
  if (error) throw error

  const usedNicknames = new Set((data ?? []).map(({ nickname }) => nickname))
  const firstCandidate = baseNickname.slice(0, MAX_NICKNAME_LENGTH)
  if (!usedNicknames.has(firstCandidate)) return firstCandidate

  for (let suffix = 2; ; suffix++) {
    const suffixText = String(suffix)
    const candidate = `${baseNickname.slice(0, MAX_NICKNAME_LENGTH - suffixText.length)}${suffixText}`
    if (!usedNicknames.has(candidate)) return candidate
  }
}

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

    // 3. Supabase 사용자 upsert
    const admin = createAdminClient()
    const fakeEmail = `kakao_${kakaoId}@kakao.wangwangland.internal`

    let userId: string
    let isNewUser = false
    let onboardingNickname = kakaoNickname

    const existingUserId = await findUserIdByEmail(admin, fakeEmail)

    if (existingUserId) {
      userId = existingUserId
    } else {
      let createdUserId: string | null = null

      // 동명이인은 이름2, 이름3 순으로 배정한다. 동시 가입 충돌 시 다시 계산해 재시도한다.
      for (let attempt = 0; attempt < 5 && !createdUserId; attempt++) {
        const availableNickname = await getAvailableNickname(admin, kakaoNickname)
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: fakeEmail,
          email_confirm: true,
          user_metadata: {
            kakao_id: kakaoId,
            full_name: availableNickname,
            avatar_url: kakaoAvatar,
          },
        })

        if (!createErr && created.user) {
          createdUserId = created.user.id
          onboardingNickname = availableNickname
          break
        }

        // 생성 응답이 실패해도 계정이 만들어졌을 가능성을 먼저 확인한다.
        const userIdAfterCreate = await findUserIdByEmail(admin, fakeEmail)
        if (userIdAfterCreate) {
          createdUserId = userIdAfterCreate
          onboardingNickname = availableNickname
        }
      }

      if (!createdUserId) {
        console.error("카카오 사용자 생성 실패")
        return NextResponse.redirect(new URL("/login?error=1", origin))
      }

      isNewUser = true
      userId = createdUserId
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
      .select("nickname, status, is_banned, role, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version")
      .eq("id", userId)
      .maybeSingle()

    // 현재 약관/개인정보 처리방침 버전 (terms/page.tsx, privacy/page.tsx 와 동기화)
    const CURRENT_TERMS_VERSION = "2026-04-27"
    const CURRENT_PRIVACY_VERSION = "2026-04-27"

    function needsAgreement() {
      if (!profile) return false
      if (!profile.terms_agreed_at || profile.terms_version !== CURRENT_TERMS_VERSION) return true
      if (!profile.privacy_agreed_at || profile.privacy_version !== CURRENT_PRIVACY_VERSION) return true
      return false
    }

    // 리다이렉트 목적지 결정
    let redirectPath = "/"
    if (profile?.is_banned) {
      redirectPath = "/login?error=banned"
    } else if (isNewUser) {
      redirectPath = onboardingNickname
        ? `/onboarding?name=${encodeURIComponent(onboardingNickname)}`
        : "/onboarding"
    } else if (!profile || profile.status === "pending") {
      redirectPath = "/pending"
    } else if (profile.status === "rejected") {
      redirectPath = "/rejected"
    } else if (needsAgreement()) {
      // 기존 회원이 신규/개정된 약관에 미동의 → 재동의 페이지로
      redirectPath = "/agreement"
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
