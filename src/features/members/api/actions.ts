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

/** 어드민: 회원 상태 변경 */
export async function updateMemberStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}

/** 어드민: 회원 권한 변경 */
export async function updateMemberRole(
  id: string,
  role: "member" | "full_member" | "staff"
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath("/admin/members")
  return {}
}
