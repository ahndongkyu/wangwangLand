"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"

export type StaffRole = "admin" | "staff"

export interface AdminMutationResult {
  error?: string
}

/** 운영진 역할 변경 (admin ↔ staff). 관리자만 실행 가능. */
export async function updateAdminRole(
  profileId: string,
  role: StaffRole
): Promise<AdminMutationResult> {
  if (role !== "admin" && role !== "staff") {
    return { error: "올바르지 않은 역할입니다." }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("profiles")
    .update({ role })
    .eq("id", profileId)

  if (error) {
    console.error("[updateAdminRole]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/admins")
  return {}
}

/** 운영진 제거 — role을 full_member로 강등. 본인은 제거 불가. */
export async function removeAdmin(profileId: string): Promise<AdminMutationResult> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: "로그인이 필요합니다." }

  if (session.user.id === profileId) {
    return { error: "본인은 직접 제거할 수 없습니다." }
  }

  const adminClient = createAdminClient()

  // 타깃의 현재 role 확인
  const { data: target } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle()

  // 타깃이 admin이면 남은 admin 수 확인 (최소 1명 보장)
  if (target?.role === "admin") {
    const { count } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")

    if ((count ?? 0) <= 1) {
      return { error: "관리자는 최소 1명 이상 유지되어야 합니다." }
    }
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ role: "full_member" })
    .eq("id", profileId)

  if (error) {
    console.error("[removeAdmin]", error)
    return { error: error.message }
  }

  revalidatePath("/admin/admins")
  return {}
}
