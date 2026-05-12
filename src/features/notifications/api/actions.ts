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

  // 댓글 작성자 닉네임 조회 (Push 메시지용)
  const { data: actor } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", actorId)
    .maybeSingle()
  const actorName = (actor as { nickname?: string } | null)?.nickname ?? "누군가"

  // Push 알림 (IN-APP과 별도 — 실패해도 무시)
  try {
    const { sendPushToUser } = await import("@/features/push")
    await Promise.all(
      targets.map((t) =>
        sendPushToUser(
          {
            title: t.type === "reply_to_comment" ? "💬 새 대댓글" : "💬 새 댓글",
            body: t.type === "reply_to_comment"
              ? `${actorName}님이 내 댓글에 답글을 달았어요.`
              : `${actorName}님이 댓글을 달았어요.`,
            url: postType === "notice"
              ? `/notice/${postId}`
              : postType === "story"
                ? `/stories/${postId}`
                : `/daily/${postId}`,
            tag: `comment-${commentId}`,
          },
          t.userId
        )
      )
    )
  } catch (e) {
    console.error("[sendCommentNotifications push]", e)
  }
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
