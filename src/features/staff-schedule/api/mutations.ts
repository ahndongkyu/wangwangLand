"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"

interface UpsertInput {
  user_id: string
  date: string // YYYY-MM-DD
  start_time?: string | null // HH:MM
  end_time?: string | null
  note?: string | null
}

/** 운영진의 권한 확인 (admin/staff) */
async function requireStaff(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return { ok: false, error: "운영진 권한이 필요합니다." }
  }

  return { ok: true, userId: user.id }
}

/** 출근 등록/수정 (upsert by user_id+date) */
export async function upsertStaffAvailability(
  input: UpsertInput
): Promise<{ error?: string }> {
  const auth = await requireStaff()
  if (!auth.ok) return { error: auth.error }

  if (!input.user_id) return { error: "운영진을 선택해주세요." }
  if (!input.date) return { error: "날짜를 선택해주세요." }

  // 시간 검증
  if (input.start_time && input.end_time) {
    if (input.start_time >= input.end_time) {
      return { error: "종료 시간은 시작 시간보다 뒤여야 합니다." }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("staff_availability")
    .upsert(
      {
        user_id: input.user_id,
        registered_by_id: auth.userId,
        date: input.date,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        note: input.note?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    )

  if (error) {
    console.error("[upsertStaffAvailability]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/schedule")
  revalidatePath("/volunteer")
  revalidatePath("/my/applications", "layout")
  return {}
}

/** 출근 등록 삭제 */
export async function deleteStaffAvailability(id: string): Promise<{ error?: string }> {
  const auth = await requireStaff()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.from("staff_availability").delete().eq("id", id)

  if (error) {
    console.error("[deleteStaffAvailability]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/schedule")
  revalidatePath("/volunteer")
  revalidatePath("/my/applications", "layout")
  return {}
}
