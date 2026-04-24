import { createClient } from "@/shared/lib/supabase/server"

export interface UserNotification {
  id: string
  type: "comment_on_post" | "reply_to_comment"
  post_type: string
  post_id: string
  comment_id: string | null
  is_read: boolean
  created_at: string
  actor: { nickname: string; role: string } | null
}

export async function listMyNotifications(): Promise<UserNotification[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, post_type, post_id, comment_id, is_read, created_at, actor_id")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(30)

  if (error || !data) return []

  // 액터 일괄 조회
  const actorIds = [...new Set(data.map((n) => n.actor_id).filter(Boolean))] as string[]
  const actorMap: Record<string, { nickname: string; role: string }> = {}
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, role")
      .in("id", actorIds)
    for (const p of profiles ?? []) actorMap[p.id] = { nickname: p.nickname, role: p.role }
  }

  return data.map((n) => ({
    id: n.id,
    type: n.type,
    post_type: n.post_type,
    post_id: n.post_id,
    comment_id: n.comment_id,
    is_read: n.is_read,
    created_at: n.created_at,
    actor: n.actor_id ? (actorMap[n.actor_id] ?? null) : null,
  }))
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false)

  return count ?? 0
}
