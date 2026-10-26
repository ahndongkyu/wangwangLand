"use server"

import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"

/** 신청 내용은 전송하지 않고 운영진에게 현재 버전만 제공합니다. */
export async function getVolunteerRevision(id: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const { data, error } = await createAdminClient().from("volunteer_applications")
    .select("status, updated_at").eq("id", id).maybeSingle()
  if (error) return { error: "신청 상태를 확인하지 못했습니다." }
  return { revision: data }
}
