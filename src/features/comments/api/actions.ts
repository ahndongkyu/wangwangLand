"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/shared/lib/supabase/server"
import { sendCommentNotifications } from "@/features/notifications/api/actions"
import type { PostType } from "./queries"

export async function createComment(
  postType: PostType,
  postId: string,
  content: string,
  parentId?: string
): Promise<{ error?: string }> {
  const trimmed = content.trim()
  if (!trimmed) return { error: "내용을 입력해주세요." }
  if (trimmed.length > 500) return { error: "댓글은 500자 이하로 작성해주세요." }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "로그인이 필요합니다." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status, is_banned")
    .eq("id", session.user.id)
    .maybeSingle()

  if (!profile || profile.status !== "approved" || profile.is_banned) {
    return { error: "승인된 회원만 댓글을 작성할 수 있습니다." }
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_type: postType,
      post_id: postId,
      parent_id: parentId ?? null,
      user_id: session.user.id,
      content: trimmed,
    })
    .select("id")
    .single()

  if (error || !comment) {
    console.error("[createComment] insert error:", JSON.stringify(error))
    return { error: "댓글 작성에 실패했습니다." }
  }

  // 알림 발송 (실패해도 댓글 등록엔 영향 없음)
  sendCommentNotifications({
    commentId: comment.id,
    postType,
    postId,
    parentId: parentId ?? null,
    actorId: session.user.id,
  }).catch(console.error)

  const path = postType === "notice" ? `/notice/${postId}` : postType === "story" ? `/stories/${postId}` : `/daily/${postId}`
  revalidatePath(path)
  return {}
}

export async function updateComment(
  commentId: string,
  content: string,
  postType: PostType,
  postId: string
): Promise<{ error?: string }> {
  const trimmed = content.trim()
  if (!trimmed) return { error: "내용을 입력해주세요." }
  if (trimmed.length > 500) return { error: "댓글은 500자 이하로 작성해주세요." }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "로그인이 필요합니다." }

  const { error } = await supabase
    .from("comments")
    .update({ content: trimmed })
    .eq("id", commentId)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("[updateComment]", error)
    return { error: "수정에 실패했습니다." }
  }

  const path = postType === "notice" ? `/notice/${postId}` : postType === "story" ? `/stories/${postId}` : `/daily/${postId}`
  revalidatePath(path)
  return {}
}

export async function deleteComment(
  commentId: string,
  postType: PostType,
  postId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: "로그인이 필요합니다." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle()

  const isStaff = profile?.role === "staff" || profile?.role === "admin"

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .or(isStaff ? `id.eq.${commentId}` : `user_id.eq.${session.user.id}`)

  if (error) return { error: "삭제에 실패했습니다." }

  const path = postType === "notice" ? `/notice/${postId}` : postType === "story" ? `/stories/${postId}` : `/daily/${postId}`
  revalidatePath(path)
  return {}
}
