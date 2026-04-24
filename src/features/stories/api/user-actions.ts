"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/server"

export async function createStoryAsUser(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const title = (formData.get("title") as string ?? "").trim()
  const content = (formData.get("content") as string ?? "").trim()
  const images = (formData.get("images") as string ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean)

  if (!title) return { error: "제목을 입력해주세요." }
  if (!content) return { error: "내용을 입력해주세요." }
  if (images.length === 0) return { error: "사진을 최소 1장 추가해주세요." }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "로그인이 필요합니다." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role, is_banned")
    .eq("id", session.user.id)
    .maybeSingle()

  if (!profile || profile.status !== "approved" || profile.is_banned) {
    return { error: "로그인 후 이용할 수 있습니다." }
  }
  if (profile.role === "member") {
    return { error: "정회원 이상만 게시글을 작성할 수 있습니다." }
  }

  const { data, error } = await supabase
    .from("adoption_stories")
    .insert({
      title,
      content,
      images,
      published_at: new Date().toISOString(),
      created_by: session.user.id,
    })
    .select("id")
    .single()

  if (error) return { error: "게시글 작성에 실패했습니다." }

  revalidatePath("/stories")
  redirect(`/stories/${data.id}`)
}
