"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

/** 로그인 유저의 공지 마지막 열람 시각을 DB에 저장 */
export async function markNoticesSeenInDB() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  await supabase
    .from("profiles")
    .update({ notices_last_seen_at: new Date().toISOString() })
    .eq("id", session.user.id)
}

export interface NoticeMutationResult {
  error?: string
  id?: string
  redirectTo?: string
}

interface NoticeInput {
  title: string
  content: string
  is_pinned: boolean
  publish: boolean
  images: string[]
}

function parseFormData(formData: FormData): NoticeInput {
  const titleBody = String(formData.get("title") ?? "").trim()
  const prefix = String(formData.get("notice_prefix") ?? "").trim()
  const title = prefix ? `[${prefix}] ${titleBody}` : titleBody
  const content = String(formData.get("content") ?? "")
  return {
    title,
    content,
    is_pinned: formData.get("is_pinned") === "on",
    publish: formData.get("publish") === "on",
    images: extractImagesFromHtml(content),
  }
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/notices")
  revalidatePath("/notice")
  revalidatePath("/")
  if (id) {
    revalidatePath(`/admin/notices/${id}/edit`)
    revalidatePath(`/notice/${id}`)
  }
}

export async function createNotice(
  formData: FormData
): Promise<NoticeMutationResult> {
  const input = parseFormData(formData)

  if (!input.title) return { error: "제목은 필수입니다." }
  if (!input.content.trim()) return { error: "내용은 필수입니다." }

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notices")
    .insert({
      title: input.title,
      content: input.content,
      is_pinned: input.is_pinned,
      images: input.images,
      published_at: input.publish ? new Date().toISOString() : null,
      created_by: auth.userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createNotice]", error)
    return { error: error.message }
  }

  // 공개 게시 시 푸시 알림 발송 (실패해도 게시는 성공) — 작성자 제외
  if (input.publish && data?.id) {
    try {
      const { sendPushSystem } = await import("@/features/push")
      await sendPushSystem(
        {
          title: "📢 새 공지사항",
          body: input.title,
          url: `/notice/${data.id}`,
          tag: `notice-${data.id}`,
        },
        auth.userId
      )
    } catch (e) {
      console.error("[push notice]", e)
    }
  }

  revalidateAll()
  return { redirectTo: "/admin/notices" }
}

export async function updateNotice(
  id: string,
  formData: FormData
): Promise<NoticeMutationResult> {
  const input = parseFormData(formData)

  if (!input.title) return { error: "제목은 필수입니다." }
  if (!input.content.trim()) return { error: "내용은 필수입니다." }

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // 기존 published_at 유지 또는 publish 토글에 따라 갱신
  const { data: existing } = await supabase
    .from("notices")
    .select("published_at")
    .eq("id", id)
    .maybeSingle()

  let publishedAt: string | null = existing?.published_at ?? null
  if (input.publish && !publishedAt) {
    publishedAt = new Date().toISOString()
  } else if (!input.publish) {
    publishedAt = null
  }

  const { error } = await supabase
    .from("notices")
    .update({
      title: input.title,
      content: input.content,
      is_pinned: input.is_pinned,
      images: input.images,
      published_at: publishedAt,
    })
    .eq("id", id)

  if (error) {
    console.error("[updateNotice]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return { redirectTo: "/admin/notices" }
}

export async function bulkDeleteNotices(ids: string[]): Promise<{ error?: string }> {
  if (!ids.length) return {}
  const admin = createAdminClient()
  const { error } = await admin.from("notices").delete().in("id", ids)
  if (error) {
    console.error("[bulkDeleteNotices]", error)
    return { error: error.message }
  }
  revalidatePath("/admin/notices")
  revalidatePath("/notice")
  revalidatePath("/")
  return {}
}

export async function deleteNotice(
  id: string
): Promise<NoticeMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from("notices").delete().eq("id", id)

  if (error) {
    console.error("[deleteNotice]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
