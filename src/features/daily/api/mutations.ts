"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"

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
  const images = String(formData.get("images") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const postedAt = String(formData.get("posted_at") ?? "").trim()

  return {
    title: String(formData.get("title") ?? "").trim(),
    content: String(formData.get("content") ?? ""),
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
  if (input.images.length === 0)
    return { error: "사진을 최소 1장 이상 추가해주세요." }
  if (input.images.length > MAX_IMAGES)
    return { error: `사진은 최대 ${MAX_IMAGES}장까지 등록 가능합니다.` }

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
  if (input.images.length === 0)
    return { error: "사진을 최소 1장 이상 유지해주세요." }
  if (input.images.length > MAX_IMAGES)
    return { error: `사진은 최대 ${MAX_IMAGES}장까지 등록 가능합니다.` }

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
