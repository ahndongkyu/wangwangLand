"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/shared/lib/supabase/server"
import type { DogGender, DogSize, DogStatus } from "@/shared/types/database"

export interface DogMutationInput {
  name: string
  breed: string
  gender: DogGender
  size: DogSize | null
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
  const images = String(formData.get("images") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const thumbnailIndex = Number(formData.get("thumbnail_index") ?? 0)
  const sizeRaw = String(formData.get("size") ?? "").trim()
  const kennelLocation = String(formData.get("kennel_location") ?? "").trim()
  const neuteredRaw = String(formData.get("neutered") ?? "")

  return {
    name: String(formData.get("name") ?? "").trim(),
    breed: String(formData.get("breed") ?? "").trim(),
    gender: (String(formData.get("gender") ?? "미상") as DogGender),
    size: sizeRaw ? (sizeRaw as DogSize) : null,
    age_months: ageStr ? Number(ageStr) : null,
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

const MAX_IMAGES = 10

export async function createDog(formData: FormData): Promise<MutationResult> {
  const input = parseFormData(formData)

  if (!input.name) return { error: "이름은 필수입니다." }
  if (input.images.length > MAX_IMAGES) {
    return { error: `사진은 최대 ${MAX_IMAGES}장까지 등록 가능합니다.` }
  }

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
    .from("dogs")
    .insert({ ...input, created_by: admin.id })
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
