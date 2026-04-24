"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"

type PostType = "notice" | "story" | "daily"

/** 댓글 생성 후 알림 발송 */
export async function sendCommentNotifications(opts: {
  commentId: string
  postType: PostType
  postId: string
  parentId: string | null
  actorId: string
}) {
  const { commentId, postType, postId, parentId, actorId } = opts
  const admin = createAdminClient()

  const targets: Array<{ userId: string; type: "comment_on_post" | "reply_to_comment" }> = []

  if (parentId) {
    // 대댓글 → 부모 댓글 작성자에게 알림
    const { data: parent } = await admin
      .from("comments")
      .select("user_id")
      .eq("id", parentId)
      .maybeSingle()
    if (parent?.user_id && parent.user_id !== actorId) {
      targets.push({ userId: parent.user_id, type: "reply_to_comment" })
    }
  } else {
    // 일반 댓글 → 게시글 작성자에게 알림
    const table =
      postType === "daily" ? "daily_posts"
      : postType === "story" ? "adoption_stories"
      : "notices"
    const { data: post } = await admin
      .from(table)
      .select("created_by")
      .eq("id", postId)
      .maybeSingle()
    if (post?.created_by && post.created_by !== actorId) {
      targets.push({ userId: post.created_by, type: "comment_on_post" })
    }
  }

  if (targets.length === 0) return

  await admin.from("notifications").insert(
    targets.map((t) => ({
      user_id: t.userId,
      type: t.type,
      post_type: postType,
      post_id: postId,
      comment_id: commentId,
      actor_id: actorId,
    }))
  )
}

/** 알림 읽음 처리 */
export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", session.user.id)

  revalidatePath("/")
}

/** 전체 읽음 처리 */
export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false)

  revalidatePath("/")
}
