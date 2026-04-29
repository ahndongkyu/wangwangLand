"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

/** profiles.role 기반 운영진 체크. 통과 시 user.id 반환, 실패 시 에러 메시지. */
async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!me || !["staff", "admin"].includes(me.role)) {
    return { ok: false, error: "운영진 권한이 없습니다." }
  }
  return { ok: true, userId: user.id }
}

export interface NoticeMutationResult {
  error?: string
  id?: string
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
  const { error } = await supabase
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

  revalidateAll()
  redirect("/admin/notices")
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
  redirect("/admin/notices")
}

export async function deleteNotice(
  id: string
): Promise<NoticeMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from("notices").delete().eq("id", id)

  if (error) {
    console.error("[deleteNotice]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
