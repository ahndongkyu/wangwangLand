"use server"

import { requireAdmin } from "@/shared/lib/auth"
import { deleteDailyPost } from "./mutations"
import { deleteAdoptionStory } from "@/features/stories/api/mutations"
import { deleteDonationThanks } from "@/features/thanks/api/mutations"

export async function deleteCommunityPost(key: string): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const [source, id, extra] = key.split(":")
  if (!id || extra || !/^[0-9a-f-]{36}$/i.test(id)) return { error: "잘못된 게시물입니다." }
  if (source === "daily") return deleteDailyPost(id)
  if (source === "story") return deleteAdoptionStory(id)
  if (source === "thanks") return deleteDonationThanks(id)
  return { error: "지원하지 않는 게시물 유형입니다." }
}
