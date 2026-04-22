"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/shared/lib/supabase/server"
import type { AdminRole } from "@/shared/types/database"

export interface AdminMutationResult {
  error?: string
}

/**
 * 어드민 역할 변경 (admin ↔ editor).
 * RLS 및 ensure_at_least_one_top_admin() 트리거가 추가 검증.
 */
export async function updateAdminRole(
  id: string,
  role: AdminRole
): Promise<AdminMutationResult> {
  if (role !== "admin" && role !== "editor") {
    return { error: "올바르지 않은 역할입니다." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("admins")
    .update({ role })
    .eq("id", id)

  if (error) {
    console.error("[updateAdminRole]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/admins")
  return {}
}

/**
 * 어드민 제거 (admins 테이블에서만 삭제).
 * auth.users 는 남아있어 Supabase 대시보드에서 별도 삭제 필요.
 * 최소 1명의 최고관리자는 남도록 DB 트리거에서 보장.
 */
export async function removeAdmin(id: string): Promise<AdminMutationResult> {
  const supabase = await createClient()

  // 자기 자신 제거 방지
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "로그인이 필요합니다." }

  const { data: selfAdmin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (selfAdmin?.id === id) {
    return { error: "본인은 직접 제거할 수 없습니다." }
  }

  const { error } = await supabase.from("admins").delete().eq("id", id)

  if (error) {
    console.error("[removeAdmin]", error)
    // DB 트리거 에러 메시지를 그대로 전달
    return { error: error.message }
  }

  revalidatePath("/admin/admins")
  return {}
}
