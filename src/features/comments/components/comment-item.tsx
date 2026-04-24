"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { User, Trash2, CornerDownRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { RoleBadge } from "@/shared/components/role-badge"
import { deleteComment } from "../api/actions"
import { CommentForm } from "./comment-form"
import type { Comment, PostType, CommentAuthor } from "../api/queries"

interface Props {
  comment: Comment
  postType: PostType
  postId: string
  currentUserId: string | null
  currentUserAuthor: CommentAuthor | null
  isStaff: boolean
  isReply?: boolean
}

export function CommentItem({ comment, postType, postId, currentUserId, currentUserAuthor, isStaff, isReply }: Props) {
  const [showReply, setShowReply] = useState(false)
  const [pending, startTransition] = useTransition()

  const canDelete = currentUserId && (comment.author_id === currentUserId || isStaff)

  function handleDelete() {
    if (!confirm("댓글을 삭제할까요?")) return
    startTransition(async () => {
      await deleteComment(comment.id, postType, postId)
    })
  }

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })

  return (
    <div className={isReply ? "ml-8 border-l-2 border-border pl-4" : ""}>
      <div className="flex gap-3">
        {/* 아바타 */}
        <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {comment.author?.avatar_url ? (
            <Image src={comment.author.avatar_url} alt={comment.author.nickname ?? ""} fill className="object-cover" />
          ) : (
            <User className="size-full p-1.5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 헤더 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {comment.author ? (
              <>
                <RoleBadge role={comment.author.role} />
                <span className="text-sm font-medium text-foreground">{comment.author.nickname}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">(탈퇴한 회원)</span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          {/* 내용 */}
          <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* 액션 */}
          <div className="mt-1.5 flex items-center gap-3">
            {!isReply && currentUserId && (
              <button
                type="button"
                onClick={() => setShowReply((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CornerDownRight className="size-3" />
                답글
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3" />
                삭제
              </button>
            )}
          </div>

          {/* 대댓글 폼 */}
          {showReply && currentUserAuthor && (
            <div className="mt-3">
              <CommentForm
                postType={postType}
                postId={postId}
                parentId={comment.id}
                author={currentUserAuthor}
                placeholder={`${comment.author?.nickname ?? ""}님에게 답글...`}
                onDone={() => setShowReply(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 대댓글 목록 */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postType={postType}
              postId={postId}
              currentUserId={currentUserId}
              currentUserAuthor={currentUserAuthor}
              isStaff={isStaff}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}
