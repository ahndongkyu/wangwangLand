"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/shared/lib/supabase/admin"
import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

export async function markStoriesSeenInDB() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  await supabase.from("profiles").update({ stories_last_seen_at: new Date().toISOString() }).eq("id", session.user.id)
}

export interface StoryMutationResult {
  error?: string
  id?: string
  redirectTo?: string
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

/** 현재 로그인한 유저의 profile 반환. 차단 상태면 null. */
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

export async function createAdoptionStory(
  formData: FormData
): Promise<StoryMutationResult> {
  const input = parseFormData(formData)
  const returnTo = String(formData.get("_returnTo") ?? "/stories")
  const err = validate(input)
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  const { data, error } = await supabase
    .from("adoption_stories")
    .insert({
      title: input.title,
      content: input.content,
      dog_id: input.dog_id,
      images: input.images,
      published_at: input.published ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[createAdoptionStory]", error)
    return { error: error.message }
  }

  // 푸시 알림 (공개 시에만, 작성자 제외)
  if (input.published && data?.id) {
    try {
      const { data: author } = await supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle()
      const authorName = author?.nickname ?? "회원"
      const { sendPushSystem } = await import("@/features/push")
      await sendPushSystem(
        {
          title: "💕 새 입양 후기",
          body: `${authorName}님이 입양 후기를 올렸어요: ${input.title}`,
          url: `/stories/${data.id}`,
          tag: `story-${data.id}`,
        },
        user.id
      )
    } catch (e) {
      console.error("[push story]", e)
    }
  }

  revalidateAll()
  return { redirectTo: returnTo }
}

export async function updateAdoptionStory(
  id: string,
  formData: FormData
): Promise<StoryMutationResult> {
  const input = parseFormData(formData)
  const returnTo = String(formData.get("_returnTo") ?? "/stories")
  const err = validate(input)
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  // 본인 글 또는 staff/admin만 수정 가능
  const { data: story } = await supabase
    .from("adoption_stories")
    .select("created_by, published_at")
    .eq("id", id)
    .maybeSingle()

  if (!story) return { error: "글을 찾을 수 없습니다." }

  const isAuthor = story.created_by === user.id
  const isStaff = profile.role === "staff" || profile.role === "admin"
  if (!isAuthor && !isStaff) return { error: "수정 권한이 없습니다." }

  let published_at: string | null
  if (input.published) {
    published_at = story.published_at ?? new Date().toISOString()
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
  return { redirectTo: returnTo }
}

export async function bulkDeleteAdoptionStories(ids: string[]): Promise<{ error?: string }> {
  if (!ids.length) return {}
  const admin = createAdminClient()
  const { error } = await admin.from("adoption_stories").delete().in("id", ids)
  if (error) {
    console.error("[bulkDeleteAdoptionStories]", error)
    return { error: error.message }
  }
  revalidatePath("/admin/stories")
  revalidatePath("/stories")
  revalidatePath("/")
  return {}
}

export async function deleteAdoptionStory(
  id: string
): Promise<StoryMutationResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const profile = await getApprovedProfile(supabase, user.id)
  if (!profile) return { error: "권한이 없습니다." }

  // 본인 글 또는 staff/admin만 삭제 가능
  const { data: story } = await supabase
    .from("adoption_stories")
    .select("created_by")
    .eq("id", id)
    .maybeSingle()

  if (!story) return { error: "글을 찾을 수 없습니다." }

  const isAuthor = story.created_by === user.id
  const isStaff = profile.role === "staff" || profile.role === "admin"
  if (!isAuthor && !isStaff) return { error: "삭제 권한이 없습니다." }

  const admin = createAdminClient()
  const { error } = await admin.from("adoption_stories").delete().eq("id", id)

  if (error) {
    console.error("[deleteAdoptionStory]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
