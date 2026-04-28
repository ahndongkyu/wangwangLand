"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"

/** 카카오 OAuth URL 반환 — Supabase를 거치지 않고 카카오 직접 연동 */
export async function getKakaoLoginUrl(): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/kakao/callback`,
    response_type: "code",
    scope: "profile_nickname profile_image",
  })
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
}

/** 이메일/비밀번호 로그인 (테스트 계정용) */
export async function signInWithEmail(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = (formData.get("email") as string | null)?.trim() ?? ""
  const password = (formData.get("password") as string | null) ?? ""

  if (!email || !password) return { error: "이메일과 비밀번호를 입력해주세요." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." }

  // 프로필 확인 후 리다이렉트
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "로그인에 실패했습니다." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", session.user.id)
    .maybeSingle()

  if (!profile) redirect("/onboarding")
  if (profile.status === "pending") redirect("/pending")
  if (profile.status === "rejected") redirect("/rejected")
  redirect("/")
}

/** 로그아웃 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

/** 온보딩: 닉네임 + 약관/개인정보 동의 (필수) + 마케팅 수신(선택) */
export async function updateNickname(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? ""
  const phone = (formData.get("phone") as string | null)?.trim() ?? ""
  const ageOk = formData.get("age_agree") === "on"
  const termsOk = formData.get("terms_agree") === "on"
  const privacyOk = formData.get("privacy_agree") === "on"
  const marketingOk = formData.get("marketing_agree") === "on"
  const termsVersion = (formData.get("terms_version") as string | null) ?? null
  const privacyVersion = (formData.get("privacy_version") as string | null) ?? null

  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "닉네임은 2~20자 사이로 입력해주세요." }
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글, 영문, 숫자, _만 사용할 수 있습니다." }
  }
  if (!phone) return { error: "핸드폰번호를 입력해주세요." }
  if (!/^[0-9-]{9,}$/.test(phone)) {
    return { error: "올바른 핸드폰번호 형식이 아닙니다." }
  }
  if (!ageOk) return { error: "만 14세 이상 동의가 필요합니다." }
  if (!termsOk) return { error: "이용약관 동의가 필요합니다." }
  if (!privacyOk) return { error: "개인정보 처리방침 동의가 필요합니다." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  // 중복 확인
  const { data: dup } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .neq("id", user.id)
    .maybeSingle()

  if (dup) return { error: "이미 사용 중인 닉네임입니다." }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("profiles")
    .update({
      nickname,
      phone,
      status: "approved",
      terms_agreed_at: now,
      terms_version: termsVersion,
      privacy_agreed_at: now,
      privacy_version: privacyVersion,
      marketing_agreed_at: marketingOk ? now : null,
      updated_at: now,
    })
    .eq("id", user.id)

  if (error) return { error: "저장에 실패했습니다." }

  redirect("/")
}

/** 프로필 업데이트 — 닉네임 + 아바타 + 핸드폰번호 */
export async function updateProfile(
  _prev: { error: string | null; success?: boolean },
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? ""
  const phoneRaw = (formData.get("phone") as string | null)?.trim() ?? ""
  const avatarFile = formData.get("avatar") as File | null

  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "닉네임은 2~20자 사이로 입력해주세요." }
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글, 영문, 숫자, _만 사용할 수 있습니다." }
  }

  // 핸드폰번호: 빈 값이면 null, 그 외엔 숫자/하이픈만 허용
  let phone: string | null = null
  if (phoneRaw) {
    if (!/^[0-9-]+$/.test(phoneRaw)) {
      return { error: "핸드폰번호는 숫자와 하이픈(-)만 입력 가능합니다." }
    }
    phone = phoneRaw
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return { error: "로그인이 필요합니다." }

  // 닉네임 중복 확인
  const { data: dup } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .neq("id", user.id)
    .maybeSingle()
  if (dup) return { error: "이미 사용 중인 닉네임입니다." }

  // 아바타 업로드
  let avatarUrl: string | undefined
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 3 * 1024 * 1024) {
      return { error: "이미지는 3MB 이하만 가능합니다." }
    }
    const ext = avatarFile.name.split(".").pop() ?? "jpg"
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
    if (uploadErr) return { error: `이미지 업로드에 실패했습니다: ${uploadErr.message}` }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
    avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
  }

  const updates: Record<string, unknown> = {
    nickname,
    phone,
    updated_at: new Date().toISOString(),
  }
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)
  if (error) return { error: "저장에 실패했습니다." }

  revalidatePath("/profile")
  revalidatePath("/")
  return { error: null, success: true }
}

/** 약관 재동의 — 기존 회원이 약관 미동의 또는 버전 불일치 시 동의 시각/버전 갱신 */
export async function acceptAgreements(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const termsOk = formData.get("terms_agree") === "on"
  const privacyOk = formData.get("privacy_agree") === "on"
  const marketingOk = formData.get("marketing_agree") === "on"
  const termsVersion = (formData.get("terms_version") as string | null) ?? null
  const privacyVersion = (formData.get("privacy_version") as string | null) ?? null

  if (!termsOk) return { error: "이용약관 동의가 필요합니다." }
  if (!privacyOk) return { error: "개인정보 처리방침 동의가 필요합니다." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("profiles")
    .update({
      terms_agreed_at: now,
      terms_version: termsVersion,
      privacy_agreed_at: now,
      privacy_version: privacyVersion,
      // 마케팅: 체크면 시각 기록, 미체크면 null 로 명시 (이전 동의 철회 효과)
      marketing_agreed_at: marketingOk ? now : null,
      updated_at: now,
    })
    .eq("id", user.id)

  if (error) return { error: "저장에 실패했습니다." }

  redirect("/")
}

/** 어드민: 회원 승인 (상태 + 권한 동시 설정) */
export async function approveMember(
  id: string,
  role: "member" | "full_member" | "staff" | "admin"
): Promise<{ error?: string }> {
  // admin role 설정은 관리자만 가능
  if (role === "admin") {
    const { createClient } = await import("@/shared/lib/supabase/server")
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { error: "로그인이 필요합니다." }
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()
    if (me?.role !== "admin") return { error: "관리자만 해당 권한을 부여할 수 있습니다." }
  }

  // admin 이었던 회원을 다른 권한으로 재승인하면 admin 강등 → 마지막 admin 보호
  if (role !== "admin") {
    const guardError = await ensureNotLastAdmin(id)
    if (guardError) return { error: guardError }
  }

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ status: "approved", role })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}

/** 어드민: 회원 거절 */
export async function rejectMember(
  id: string
): Promise<{ error?: string }> {
  // admin 거절은 사실상 어드민 권한 박탈 → 마지막 admin 보호
  const guardError = await ensureNotLastAdmin(id)
  if (guardError) return { error: guardError }

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}

/** 어드민: 회원 상태 변경 (레거시 — 하위 호환) */
export async function updateMemberStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<{ error?: string }> {
  if (status === "rejected") {
    const guardError = await ensureNotLastAdmin(id)
    if (guardError) return { error: guardError }
  }

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}

/** 어드민: 회원 밴/밴 해제 */
export async function toggleMemberBan(
  id: string,
  is_banned: boolean
): Promise<{ error?: string }> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ is_banned })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}

/**
 * profiles.role 기준으로 시스템에 admin 이 1명만 남았는지 검증.
 * 마지막 admin 의 강등/거절을 막아 어드민 페이지 잠금을 방지.
 */
async function ensureNotLastAdmin(targetId: string): Promise<string | null> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  // 대상이 admin 인지 먼저 확인
  const { data: target } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", targetId)
    .maybeSingle()
  if (!target || target.role !== "admin") return null

  // approved 상태인 다른 admin 수
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "approved")
    .neq("id", targetId)

  if ((count ?? 0) === 0) {
    return "관리자는 최소 1명 이상 유지되어야 합니다. 다른 회원을 관리자로 임명한 뒤 다시 시도해주세요."
  }
  return null
}

/** 어드민: 회원 권한 변경 */
export async function updateMemberRole(
  id: string,
  role: "member" | "full_member" | "staff" | "admin"
): Promise<{ error?: string }> {
  // admin role 설정은 관리자만 가능
  if (role === "admin") {
    const { createClient } = await import("@/shared/lib/supabase/server")
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { error: "로그인이 필요합니다." }
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()
    if (me?.role !== "admin") return { error: "관리자만 해당 권한을 부여할 수 있습니다." }
  }

  // admin → 다른 권한 강등 시 마지막 admin 보호
  if (role !== "admin") {
    const guardError = await ensureNotLastAdmin(id)
    if (guardError) return { error: guardError }
  }

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}
