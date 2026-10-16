import { createClient } from "@/shared/lib/supabase/server"

/** 서비스 권한으로 본인 정보를 읽기 전에 반드시 검증한다. */
export async function getActiveMember() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await client.from("profiles")
    .select("role, status, is_banned").eq("id", user.id).maybeSingle()
  if (!profile || profile.status !== "approved" || profile.is_banned !== false) return null
  return { id: user.id, role: profile.role as string }
}

export type AdminCheckResult =
  | { ok: true; userId: string; role: "staff" | "admin" }
  | { ok: false; error: string }

/**
 * 운영진(staff/admin) 권한 검증.
 * - 미로그인: "로그인이 필요합니다."
 * - profiles.role 이 staff/admin 이 아님: "운영진 권한이 없습니다."
 *
 * 사용처: server action / route handler 에서 admin 전용 mutation 보호.
 */
export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const { data: me } = await supabase
    .from("profiles")
    .select("role, status, is_banned")
    .eq("id", user.id)
    .maybeSingle()
  if (!me || me.status !== "approved" || me.is_banned !== false || !["staff", "admin"].includes(me.role)) {
    return { ok: false, error: "운영진 권한이 없습니다." }
  }
  return { ok: true, userId: user.id, role: me.role as "staff" | "admin" }
}

/**
 * 최상위 관리자(admin)만 통과. staff 는 거부.
 */
export async function requireTopAdmin(): Promise<AdminCheckResult> {
  const res = await requireAdmin()
  if (!res.ok) return res
  if (res.role !== "admin") {
    return { ok: false, error: "최상위 관리자 권한이 필요합니다." }
  }
  return res
}
