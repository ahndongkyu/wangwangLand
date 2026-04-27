"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

export interface DailyMutationResult {
  error?: string
  id?: string
}

interface DailyInput {
  title: string
  content: string
  posted_at: string | null
  images: string[]
}

function parseFormData(formData: FormData): DailyInput {
  const content = String(formData.get("content") ?? "")
  const images = extractImagesFromHtml(content)
  const postedAt = String(formData.get("posted_at") ?? "").trim()

  return {
    title: String(formData.get("title") ?? "").trim(),
    content,
    posted_at: postedAt || null,
    images,
  }
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/daily")
  revalidatePath("/daily")
  revalidatePath("/")
  if (id) {
    revalidatePath(`/admin/daily/${id}/edit`)
    revalidatePath(`/daily/${id}`)
  }
}

/** 현재 로그인한 유저의 profile과 role을 반환. 없거나 이용 불가면 null.
 *  어드민(admins 테이블)은 profiles 여부와 무관하게 항상 허용. */
async function getApprovedProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // admins 테이블 우선 확인
  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  if (admin) {
    return { id: userId, role: "admin" as const, status: "approved" as const, is_banned: false }
  }

  // 일반 회원 profiles 확인
  const { data } = await supabase
    .from("profiles")
    .select("id, role, status, is_banned")
    .eq("id", userId)
    .maybeSingle()
  if (!data || data.status !== "approved" || data.is_banned) return null
  return data
}

export async function createDailyPost(
  formData: FormData
): Promise<DailyMutationResult> {
  const input = parseFormData(formData)
  const returnTo = String(formData.get("_returnTo") ?? "/daily")

  if (!input.title) return { error: "제목은 필수입니다." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  const { error } = await supabase
    .from("daily_posts")
    .insert({
      title: input.title,
      content: input.content || null,
      images: input.images,
      posted_at: input.posted_at ?? new Date().toISOString(),
      created_by: user.id,
    })

  if (error) {
    console.error("[createDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll()
  redirect(returnTo)
}

export async function updateDailyPost(
  id: string,
  formData: FormData
): Promise<DailyMutationResult> {
  const input = parseFormData(formData)
  const returnTo = String(formData.get("_returnTo") ?? "/daily")

  if (!input.title) return { error: "제목은 필수입니다." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  // 본인 글 또는 staff/admin만 수정 가능
  const { data: post } = await supabase
    .from("daily_posts")
    .select("created_by")
    .eq("id", id)
    .maybeSingle()

  if (!post) return { error: "글을 찾을 수 없습니다." }

  const isAuthor = post.created_by === user.id
  const isStaff = profile.role === "staff" || profile.role === "admin"
  if (!isAuthor && !isStaff) return { error: "수정 권한이 없습니다." }

  const { error } = await supabase
    .from("daily_posts")
    .update({
      title: input.title,
      content: input.content || null,
      images: input.images,
      posted_at: input.posted_at ?? new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("[updateDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  redirect(returnTo)
}

export async function deleteDailyPost(
  id: string
): Promise<DailyMutationResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  // 본인 글 또는 staff/admin만 삭제 가능
  const { data: post } = await supabase
    .from("daily_posts")
    .select("created_by")
    .eq("id", id)
    .maybeSingle()

  if (!post) return { error: "글을 찾을 수 없습니다." }

  const isAuthor = post.created_by === user.id
  const isStaff = profile.role === "staff" || profile.role === "admin"
  if (!isAuthor && !isStaff) return { error: "삭제 권한이 없습니다." }

  const { error } = await supabase.from("daily_posts").delete().eq("id", id)

  if (error) {
    console.error("[deleteDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
