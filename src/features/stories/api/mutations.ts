"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

const MAX_IMAGES = 10

export interface StoryMutationResult {
  error?: string
  id?: string
}

interface StoryInput {
  title: string
  content: string
  dog_id: string | null
  images: string[]
  published: boolean
}

function parseFormData(formData: FormData): StoryInput {
  const content = String(formData.get("content") ?? "").trim()
  const images = extractImagesFromHtml(content)
  const dogIdRaw = String(formData.get("dog_id") ?? "").trim()

  return {
    title: String(formData.get("title") ?? "").trim(),
    content,
    dog_id: dogIdRaw || null,
    images,
    published: formData.get("published") === "on",
  }
}

function validate(input: StoryInput): string | null {
  if (!input.title) return "제목은 필수입니다."
  if (!input.content || input.content === "<p></p>") return "본문은 필수입니다."
  return null
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/stories")
  revalidatePath("/stories")
  revalidatePath("/")
  if (id) {
    revalidatePath(`/admin/stories/${id}/edit`)
    revalidatePath(`/stories/${id}`)
  }
}

export async function createAdoptionStory(
  formData: FormData
): Promise<StoryMutationResult> {
  const input = parseFormData(formData)
  const err = validate(input)
  if (err) return { error: err }

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
    .from("adoption_stories")
    .insert({
      title: input.title,
      content: input.content,
      dog_id: input.dog_id,
      images: input.images,
      published_at: input.published ? new Date().toISOString() : null,
      created_by: admin.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createAdoptionStory]", error)
    return { error: error.message }
  }

  revalidateAll()
  redirect("/admin/stories")
}

export async function updateAdoptionStory(
  id: string,
  formData: FormData
): Promise<StoryMutationResult> {
  const input = parseFormData(formData)
  const err = validate(input)
  if (err) return { error: err }

  const supabase = await createClient()

  const { data: current } = await supabase
    .from("adoption_stories")
    .select("published_at")
    .eq("id", id)
    .maybeSingle()

  let published_at: string | null
  if (input.published) {
    published_at = current?.published_at ?? new Date().toISOString()
  } else {
    published_at = null
  }

  const { error } = await supabase
    .from("adoption_stories")
    .update({
      title: input.title,
      content: input.content,
      dog_id: input.dog_id,
      images: input.images,
      published_at,
    })
    .eq("id", id)

  if (error) {
    console.error("[updateAdoptionStory]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  redirect("/admin/stories")
}

export async function deleteAdoptionStory(
  id: string
): Promise<StoryMutationResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("adoption_stories").delete().eq("id", id)

  if (error) {
    console.error("[deleteAdoptionStory]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
