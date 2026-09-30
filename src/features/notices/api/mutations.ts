"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"
import type { FileAttachment, NoticeBoardType } from "@/shared/types/database"

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
  attachments: FileAttachment[]
  homeVisible: boolean
}

function parseAttachments(value: FormDataEntryValue | null): FileAttachment[] {
  if (typeof value !== "string" || !value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((item): FileAttachment[] => {
      if (!item || typeof item !== "object") return []
      const candidate = item as Record<string, unknown>
      const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
      const path = typeof candidate.path === "string" ? candidate.path : ""
      const size = typeof candidate.size === "number" ? candidate.size : NaN
      const mimeType = typeof candidate.mime_type === "string" ? candidate.mime_type : null

      if (
        !name ||
        name.length > 160 ||
        !/^expense-reports\/[A-Za-z0-9._-]+$/.test(path) ||
        !Number.isFinite(size) ||
        size < 0 ||
        size > 20 * 1024 * 1024
      ) {
        return []
      }

      return [{ name, path, size, mime_type: mimeType }]
    }).slice(0, 5)
  } catch {
    return []
  }
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
    attachments: parseAttachments(formData.get("attachments")),
    homeVisible: formData.get("home_visible") === "on",
  }
}

function revalidateAll(id?: string, boardType: NoticeBoardType = "notice") {
  const adminPath = boardType === "expense" ? "/admin/expenses" : "/admin/notices"
  revalidatePath(adminPath)
  if (boardType === "expense") {
    revalidatePath("/")
    if (id) revalidatePath(`${adminPath}/${id}/edit`)
    return
  }

  revalidatePath("/notice")
  revalidatePath("/")
  if (id) {
    revalidatePath(`${adminPath}/${id}/edit`)
    revalidatePath(`/notice/${id}`)
  }
}

export async function createNotice(
  formData: FormData,
  boardType: NoticeBoardType = "notice"
): Promise<NoticeMutationResult> {
  const input = parseFormData(formData)

  if (!input.title) return { error: "제목은 필수입니다." }
  if (boardType === "notice" && !input.content.trim()) return { error: "내용은 필수입니다." }
  if (boardType === "expense" && !input.content.trim() && !input.attachments.length) {
    return { error: "메모 또는 첨부파일을 하나 이상 입력해 주세요." }
  }

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
      published_at: boardType === "expense" ? new Date().toISOString() : input.publish ? new Date().toISOString() : null,
      created_by: auth.userId,
      board_type: boardType,
      attachments: input.attachments,
      home_visible: boardType === "expense" ? input.homeVisible : false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createNotice]", error)
    return { error: error.message }
  }

  // 공개 게시 시 푸시 알림 발송 (실패해도 게시는 성공) — 작성자 제외
  if (boardType === "notice" && input.publish && data?.id) {
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

  revalidateAll(undefined, boardType)
  return { redirectTo: boardType === "expense" ? "/admin/expenses" : "/admin/notices" }
}

export async function updateNotice(
  id: string,
  formData: FormData,
  boardType: NoticeBoardType = "notice"
): Promise<NoticeMutationResult> {
  const input = parseFormData(formData)

  if (!input.title) return { error: "제목은 필수입니다." }
  if (boardType === "notice" && !input.content.trim()) return { error: "내용은 필수입니다." }
  if (boardType === "expense" && !input.content.trim() && !input.attachments.length) {
    return { error: "메모 또는 첨부파일을 하나 이상 입력해 주세요." }
  }

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // 기존 published_at 유지 또는 publish 토글에 따라 갱신
  const { data: existing } = await supabase
    .from("notices")
    .select("published_at, board_type")
    .eq("id", id)
    .maybeSingle()

  if (!existing || existing.board_type !== boardType) {
    return { error: "해당 게시글을 찾을 수 없습니다." }
  }

  let publishedAt: string | null = existing?.published_at ?? null
  if (boardType === "expense") {
    publishedAt ??= new Date().toISOString()
  } else {
    if (input.publish && !publishedAt) {
      publishedAt = new Date().toISOString()
    } else if (!input.publish) {
      publishedAt = null
    }
  }

  const { error } = await supabase
    .from("notices")
    .update({
      title: input.title,
      content: input.content,
      is_pinned: input.is_pinned,
      images: input.images,
      published_at: publishedAt,
      attachments: input.attachments,
      home_visible: boardType === "expense" ? input.homeVisible : false,
    })
    .eq("id", id)
    .eq("board_type", boardType)

  if (error) {
    console.error("[updateNotice]", error)
    return { error: error.message }
  }

  revalidateAll(id, boardType)
  return { redirectTo: boardType === "expense" ? "/admin/expenses" : "/admin/notices" }
}

export async function bulkDeleteNotices(
  ids: string[],
  boardType: NoticeBoardType = "notice"
): Promise<{ error?: string }> {
  if (!ids.length) return {}
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from("notices").delete().in("id", ids).eq("board_type", boardType)
  if (error) {
    console.error("[bulkDeleteNotices]", error)
    return { error: error.message }
  }
  revalidateAll(undefined, boardType)
  return {}
}

export async function deleteNotice(
  id: string,
  boardType: NoticeBoardType = "notice"
): Promise<NoticeMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from("notices").delete().eq("id", id).eq("board_type", boardType)

  if (error) {
    console.error("[deleteNotice]", error)
    return { error: error.message }
  }

  revalidateAll(id, boardType)
  return {}
}
