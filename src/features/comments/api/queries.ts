import { createClient } from "@/shared/lib/supabase/server"

export interface CommentAuthor {
  nickname: string
  role: string
  avatar_url: string | null
}

export interface Comment {
  id: string
  post_type: string
  post_id: string
  parent_id: string | null
  author_id: string | null
  content: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  author: CommentAuthor | null
  replies?: Comment[]
}

export type PostType = "notice" | "story" | "daily"

/**
 * 여러 게시글의 댓글 수를 한 번에 조회.
 * 삭제된 댓글(is_deleted=true)은 제외.
 */
export async function fetchCommentCounts(
  postType: PostType,
  postIds: string[]
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("comments")
    .select("post_id")
    .eq("post_type", postType)
    .in("post_id", postIds)
    .eq("is_deleted", false)

  if (error) {
    console.error("[fetchCommentCounts]", error)
    return {}
  }
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1
  }
  return counts
}

export async function listComments(
  postType: PostType,
  postId: string
): Promise<Comment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_type", postType)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[listComments]", error)
    return []
  }

  const rows = data ?? []

  // 작성자 일괄 조회
  const authorIds = [...new Set(rows.map((c) => c.user_id).filter(Boolean))] as string[]
  const authorMap: Record<string, CommentAuthor> = {}
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, role, avatar_url")
      .in("id", authorIds)
    for (const p of profiles ?? []) {
      authorMap[p.id] = { nickname: p.nickname, role: p.role, avatar_url: p.avatar_url }
    }
  }

  // 트리 구조로 변환 (1단계 대댓글)
  const topLevel: Comment[] = []
  const replyMap: Record<string, Comment[]> = {}

  for (const row of rows) {
    const comment: Comment = {
      ...row,
      author_id: row.user_id ?? null,
      author: row.user_id ? (authorMap[row.user_id] ?? null) : null,
      replies: [],
    }
    if (!row.parent_id) {
      topLevel.push(comment)
    } else {
      if (!replyMap[row.parent_id]) replyMap[row.parent_id] = []
      replyMap[row.parent_id].push(comment)
    }
  }

  for (const comment of topLevel) {
    comment.replies = replyMap[comment.id] ?? []
  }

  return topLevel
}
