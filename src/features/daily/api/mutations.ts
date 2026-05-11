"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/shared/lib/supabase/admin"
import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

export async function markDailySeenInDB() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  await supabase.from("profiles").update({ daily_last_seen_at: new Date().toISOString() }).eq("id", session.user.id)
}

export interface DailyMutationResult {
  error?: string
  id?: string
  redirectTo?: string
}

interface DailyInput {
  title: string
  content: string
  posted_at: string | null
  images: string[]
  category: string | null
  related_volunteer_application_id: string | null
}

function parseFormData(formData: FormData): DailyInput {
  const content = String(formData.get("content") ?? "")
  const images = extractImagesFromHtml(content)
  const postedAt = String(formData.get("posted_at") ?? "").trim()
  const category = String(formData.get("category") ?? "").trim() || null
  const relatedApp = String(formData.get("related_volunteer_application_id") ?? "").trim() || null

  return {
    title: String(formData.get("title") ?? "").trim(),
    content,
    posted_at: postedAt || null,
    images,
    category,
    related_volunteer_application_id: relatedApp,
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

/** 현재 로그인한 유저의 profile + role 반환. 차단 상태면 null. */
async function getApprovedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
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

  // 봉사 후기 카테고리는 최소 1장 이상의 사진 필수
  if (input.category === "봉사 후기" && input.images.length === 0) {
    return { error: "봉사 후기는 사진을 1장 이상 첨부해주세요." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  // 봉사 인증글: 신청자 본인 + 승인 + 봉사일 지났는지 검증
  let isVolunteerCert = false
  if (input.related_volunteer_application_id) {
    const { data: app } = await supabase
      .from("volunteer_applications")
      .select("id, created_by, status, available_dates")
      .eq("id", input.related_volunteer_application_id)
      .maybeSingle()
    if (!app) return { error: "봉사 신청 정보를 찾을 수 없습니다." }
    if (app.created_by !== user.id) return { error: "본인 신청 건만 인증할 수 있습니다." }
    if (app.status !== "승인") return { error: "승인된 봉사 신청만 인증할 수 있습니다." }
    isVolunteerCert = true
  }

  const { data, error } = await supabase
    .from("daily_posts")
    .insert({
      title: input.title,
      content: input.content || null,
      images: input.images,
      posted_at: input.posted_at ?? new Date().toISOString(),
      created_by: user.id,
      category: input.category,
      related_volunteer_application_id: input.related_volunteer_application_id,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505" || /duplicate/i.test(error.message)) {
      return { error: "이미 이 봉사 신청에 대한 인증글이 있습니다." }
    }
    console.error("[createDailyPost]", error)
    return { error: error.message }
  }

  // 봉사 인증글이면 카운트 체크 → 25회 도달 시 자동 정회원 승급
  if (isVolunteerCert) {
    try {
      const admin = createAdminClient()
      const { count } = await admin
        .from("daily_posts")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("category", "봉사 후기")
        .not("related_volunteer_application_id", "is", null)
      const total = count ?? 0

      // 25회 도달 + 아직 정회원 아니면 승급
      if (total >= 25 && profile.role === "member") {
        await admin
          .from("profiles")
          .update({ role: "full_member", updated_at: new Date().toISOString() })
          .eq("id", user.id)

        // 본인에게 정회원 승급 알림
        try {
          const { sendPushToUser } = await import("@/features/push")
          await sendPushToUser(
            {
              title: "🏠 왕왕랜드 지킴이 등급 달성!",
              body: "봉사 25회를 채우셔서 정회원이 되셨어요. 감사합니다 💕",
              url: "/my",
              tag: `tier-up-${user.id}`,
            },
            user.id
          )
        } catch (e) {
          console.error("[push tier-up]", e)
        }
      }
    } catch (e) {
      console.error("[count/promote]", e)
    }
  }

  // 푸시 알림 (작성자 제외)
  if (data?.id) {
    try {
      const { data: author } = await supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle()
      const authorName = author?.nickname ?? "운영진"
      const { sendPushSystem } = await import("@/features/push")
      await sendPushSystem(
        {
          title: input.category ? `🐾 ${input.category}` : "🐾 새 일상",
          body: `${authorName}님이 새 글을 올렸어요: ${input.title}`,
          url: `/daily/${data.id}`,
          tag: `daily-${data.id}`,
        },
        user.id
      )
    } catch (e) {
      console.error("[push daily]", e)
    }
  }

  revalidateAll()
  return { redirectTo: returnTo }
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
      category: input.category,
    })
    .eq("id", id)

  if (error) {
    console.error("[updateDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return { redirectTo: returnTo }
}

export async function bulkDeleteDailyPosts(ids: string[]): Promise<{ error?: string }> {
  if (!ids.length) return {}
  const admin = createAdminClient()
  const { error } = await admin.from("daily_posts").delete().in("id", ids)
  if (error) {
    console.error("[bulkDeleteDailyPosts]", error)
    return { error: error.message }
  }
  revalidatePath("/admin/daily")
  revalidatePath("/daily")
  revalidatePath("/")
  return {}
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

  const admin = createAdminClient()
  const { error } = await admin.from("daily_posts").delete().eq("id", id)

  if (error) {
    console.error("[deleteDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
