"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { extractImagesFromHtml } from "@/shared/lib/utils"

export interface ThanksMutationResult {
  error?: string
  id?: string
}

interface ThanksInput {
  title: string
  content: string
  images: string[]
  thumbnail_index: number
  donor_display_name: string | null
  donation_summary: string | null
  donation_id: string | null
  publish: boolean
}

function parseFormData(formData: FormData): ThanksInput {
  const content = String(formData.get("content") ?? "")
  const images = extractImagesFromHtml(content)
  const thumbRaw = String(formData.get("thumbnail_index") ?? "0")
  const thumbnailIndex = Math.max(
    0,
    Math.min(images.length - 1, Number(thumbRaw) || 0)
  )
  return {
    title: String(formData.get("title") ?? "").trim(),
    content,
    images,
    thumbnail_index: thumbnailIndex,
    donor_display_name:
      String(formData.get("donor_display_name") ?? "").trim() || null,
    donation_summary:
      String(formData.get("donation_summary") ?? "").trim() || null,
    donation_id: String(formData.get("donation_id") ?? "").trim() || null,
    publish: formData.get("publish") === "on",
  }
}

function revalidateAll(id?: string) {
  revalidatePath("/admin/thanks")
  revalidatePath("/thanks")
  revalidatePath("/donate")
  revalidatePath("/")
  if (id) {
    revalidatePath(`/admin/thanks/${id}/edit`)
    revalidatePath(`/thanks/${id}`)
  }
}

export async function createDonationThanks(
  formData: FormData
): Promise<ThanksMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const input = parseFormData(formData)
  if (!input.title) return { error: "제목은 필수입니다." }
  if (!input.content.trim()) return { error: "내용은 필수입니다." }

  const supabase = await createClient()
  const { error } = await supabase.from("donation_thanks").insert({
    title: input.title,
    content: input.content,
    images: input.images,
    thumbnail_index: input.thumbnail_index,
    donor_display_name: input.donor_display_name,
    donation_summary: input.donation_summary,
    donation_id: input.donation_id,
    published_at: input.publish ? new Date().toISOString() : null,
    created_by: auth.userId,
  })

  if (error) {
    console.error("[createDonationThanks]", error)
    return { error: error.message }
  }

  revalidateAll()
  return {}
}

export async function updateDonationThanks(
  id: string,
  formData: FormData
): Promise<ThanksMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const input = parseFormData(formData)
  if (!input.title) return { error: "제목은 필수입니다." }
  if (!input.content.trim()) return { error: "내용은 필수입니다." }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("donation_thanks")
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
    .from("donation_thanks")
    .update({
      title: input.title,
      content: input.content,
      images: input.images,
      thumbnail_index: input.thumbnail_index,
      donor_display_name: input.donor_display_name,
      donation_summary: input.donation_summary,
      donation_id: input.donation_id,
      published_at: publishedAt,
    })
    .eq("id", id)

  if (error) {
    console.error("[updateDonationThanks]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}

export async function deleteDonationThanks(
  id: string
): Promise<ThanksMutationResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from("donation_thanks")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[deleteDonationThanks]", error)
    return { error: error.message }
  }

  revalidateAll(id)
  return {}
}
