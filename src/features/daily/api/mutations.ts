"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

const MAX_IMAGES = 10

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
  // 에디터 HTML 에서 이미지 URL 자동 추출 → 썸네일/갤러리에 활용
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

export async function createDailyPost(
  formData: FormData
): Promise<DailyMutationResult> {
  const input = parseFormData(formData)

  if (!input.title) return { error: "제목은 필수입니다." }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!admin) return { error: "운영진 권한이 없습니다." }

  const { error } = await supabase
    .from("daily_posts")
    .insert({
      title: input.title,
      content: input.content || null,
      images: input.images,
      posted_at: input.posted_at ?? new Date().toISOString(),
      created_by: admin.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll()
  redirect("/admin/daily")
}

export async function updateDailyPost(
  id: string,
  formData: FormData
): Promise<DailyMutationResult> {
  const input = parseFormData(formData)

  if (!input.title) return { error: "제목은 필수입니다." }

  const supabase = await createClient()
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
  redirect("/admin/daily")
}

export async function deleteDailyPost(
  id: string
): Promise<DailyMutationResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("daily_posts").delete().eq("id", id)

  if (error) {
    console.error("[deleteDailyPost]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
