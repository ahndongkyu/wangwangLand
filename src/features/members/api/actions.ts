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

/** 로그아웃 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

/** 온보딩: 닉네임 설정 */
export async function updateNickname(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? ""

  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "닉네임은 2~20자 사이로 입력해주세요." }
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글, 영문, 숫자, _만 사용할 수 있습니다." }
  }

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

  const { error } = await supabase
    .from("profiles")
    .update({ nickname, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (error) return { error: "저장에 실패했습니다." }

  redirect("/pending")
}

/** 프로필 업데이트 — 닉네임 + 아바타 */
export async function updateProfile(
  _prev: { error: string | null; success?: boolean },
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? ""
  const avatarFile = formData.get("avatar") as File | null

  if (nickname.length < 2 || nickname.length > 20) {
    return { error: "닉네임은 2~20자 사이로 입력해주세요." }
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글, 영문, 숫자, _만 사용할 수 있습니다." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    if (uploadErr) return { error: "이미지 업로드에 실패했습니다." }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
    avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
  }

  const updates: Record<string, unknown> = {
    nickname,
    updated_at: new Date().toISOString(),
  }
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)
  if (error) return { error: "저장에 실패했습니다." }

  revalidatePath("/profile")
  revalidatePath("/")
  return { error: null, success: true }
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
