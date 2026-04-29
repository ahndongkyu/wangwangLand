"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { ageMonthsFromBirthDate } from "@/shared/lib/age"
import type { DogGender, DogSize, DogStatus } from "@/shared/types/database"

export interface DogMutationInput {
  name: string
  breed: string
  gender: DogGender
  size: DogSize | null
  birth_date: string | null
  age_months: number | null
  weight_kg: number | null
  rescue_date: string | null
  status: DogStatus
  description: string
  personality: string
  health_info: string
  kennel_location: string | null
  neutered: boolean | null
  images: string[]
  thumbnail_index: number
}

export interface MutationResult {
  error?: string
  id?: string
}

function parseFormData(formData: FormData): DogMutationInput {
  const ageStr = String(formData.get("age_months") ?? "")
  const weightStr = String(formData.get("weight_kg") ?? "")
  const rescueDate = String(formData.get("rescue_date") ?? "")
  const birthDate = String(formData.get("birth_date") ?? "").trim() || null
  const images = String(formData.get("images") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const thumbnailIndex = Number(formData.get("thumbnail_index") ?? 0)
  const sizeRaw = String(formData.get("size") ?? "").trim()
  const kennelLocation = String(formData.get("kennel_location") ?? "").trim()
  const neuteredRaw = String(formData.get("neutered") ?? "")

  // birth_date 가 있으면 오늘 기준 age_months 를 덮어씌운다.
  const ageFromBirth = birthDate ? ageMonthsFromBirthDate(birthDate) : null
  const ageMonthsFinal =
    ageFromBirth !== null ? ageFromBirth : ageStr ? Number(ageStr) : null

  return {
    name: String(formData.get("name") ?? "").trim(),
    breed: String(formData.get("breed") ?? "").trim(),
    gender: (String(formData.get("gender") ?? "미상") as DogGender),
    size: sizeRaw ? (sizeRaw as DogSize) : null,
    birth_date: birthDate,
    age_months: ageMonthsFinal,
    weight_kg: weightStr ? Number(weightStr) : null,
    rescue_date: rescueDate || null,
    status: String(formData.get("status") ?? "보호중") as DogStatus,
    description: String(formData.get("description") ?? "").trim(),
    personality: String(formData.get("personality") ?? "").trim(),
    health_info: String(formData.get("health_info") ?? "").trim(),
    kennel_location: kennelLocation || null,
    neutered:
      neuteredRaw === "true"
        ? true
        : neuteredRaw === "false"
          ? false
          : null,
    images,
    thumbnail_index: Number.isFinite(thumbnailIndex) ? thumbnailIndex : 0,
  }
}

const MAX_IMAGES = 5

export async function createDog(formData: FormData): Promise<MutationResult> {
  const input = parseFormData(formData)

  if (!input.name) return { error: "이름은 필수입니다." }
  if (input.images.length > MAX_IMAGES) {
    return { error: `사진은 최대 ${MAX_IMAGES}장까지 등록 가능합니다.` }
  }

  const supabase = await createClient()

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await supabase
    .from("dogs")
    .insert({ ...input, created_by: auth.userId })
    .select("id")
    .single()

  if (error) {
    console.error("[createDog]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/dogs")
  revalidatePath("/dogs")
  revalidatePath("/")
  redirect("/admin/dogs")
}

export async function updateDog(
  id: string,
  formData: FormData
): Promise<MutationResult> {
  const input = parseFormData(formData)

  if (!input.name) return { error: "이름은 필수입니다." }
  if (input.images.length > MAX_IMAGES) {
    return { error: `사진은 최대 ${MAX_IMAGES}장까지 등록 가능합니다.` }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("dogs").update(input).eq("id", id)

  if (error) {
    console.error("[updateDog]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/dogs")
  revalidatePath(`/admin/dogs/${id}`)
  revalidatePath(`/dogs/${id}`)
  revalidatePath("/dogs")
  revalidatePath("/")
  redirect("/admin/dogs")
}

export async function updateDogStatus(
  id: string,
  status: DogStatus
): Promise<MutationResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("dogs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/dogs")
  revalidatePath(`/admin/dogs/${id}`)
  revalidatePath("/admin")
  return {}
}

const MAX_PINNED = 8

/**
 * 강아지 고정(pin) 토글.
 * - isPinned=true: 고정 ON (최대 8개 제한, 초과 시 에러)
 * - isPinned=false: 고정 OFF
 */
export async function toggleDogPin(
  id: string,
  isPinned: boolean
): Promise<MutationResult> {
  const supabase = await createClient()

  if (isPinned) {
    // 현재 고정 수 확인
    const { count } = await supabase
      .from("dogs")
      .select("id", { count: "exact", head: true })
      .eq("is_pinned", true)
      .neq("id", id) // 이미 고정된 자기 자신은 제외

    if ((count ?? 0) >= MAX_PINNED) {
      return { error: `최대 ${MAX_PINNED}개까지 고정할 수 있어요. 다른 아이를 먼저 해제해주세요.` }
    }

    // 다음 pin_order = 현재 최댓값 + 1
    const { data: maxRow } = await supabase
      .from("dogs")
      .select("pin_order")
      .eq("is_pinned", true)
      .order("pin_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = ((maxRow?.pin_order as number | null) ?? 0) + 1

    const { error } = await supabase
      .from("dogs")
      .update({ is_pinned: true, pin_order: nextOrder })
      .eq("id", id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("dogs")
      .update({ is_pinned: false, pin_order: null })
      .eq("id", id)

    if (error) return { error: error.message }
  }

  revalidatePath("/admin/dogs")
  revalidatePath(`/admin/dogs/${id}`)
  revalidatePath("/")
  return {}
}

export async function deleteDog(id: string): Promise<MutationResult> {
  const supabase = await createClient()

  const { error } = await supabase.from("dogs").delete().eq("id", id)

  if (error) {
    console.error("[deleteDog]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/dogs")
  revalidatePath("/dogs")
  revalidatePath("/")
  return {}
}
