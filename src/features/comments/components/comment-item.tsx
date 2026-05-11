"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import Image from "next/image"
import { User, Trash2, CornerDownRight, Pencil, Check, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { UserName } from "@/shared/components/user-name"
import { deleteComment, updateComment } from "../api/actions"
import { CommentForm } from "./comment-form"
import type { Comment, PostType, CommentAuthor } from "../api/queries"
import { useToast } from "@/shared/components/toast"

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
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isPendingDelete, setIsPendingDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const undoRef = useRef(false)
  const toast = useToast()

  const canDelete = currentUserId && (comment.author_id === currentUserId || isStaff)
  const canEdit = currentUserId && comment.author_id === currentUserId

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editContent.length, editContent.length)
    }
  }, [editing])

  // 낙관적 삭제 + undo 토스트
  function handleDelete() {
    undoRef.current = false
    setIsPendingDelete(true)

    toast.neutral("댓글이 삭제됐어요.", {
      duration: 5000,
      action: {
        label: "되돌리기",
        onClick: () => {
          undoRef.current = true
          setIsPendingDelete(false)
        },
      },
      onDismiss: () => {
        // toast가 자동 닫힐 때 (undo 안 눌렀으면) 실제 삭제
        if (!undoRef.current) {
          deleteComment(comment.id, postType, postId).catch(console.error)
        }
      },
    })
  }

  function handleEditSave() {
    startTransition(async () => {
      const result = await updateComment(comment.id, editContent, postType, postId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("댓글이 수정됐어요.")
        setEditing(false)
      }
    })
  }

  function handleEditCancel() {
    setEditContent(comment.content)
    setEditing(false)
  }

  // 낙관적 삭제 중 → 화면에서 숨김
  if (isPendingDelete) return null

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
              <UserName
                nickname={comment.author.nickname}
                role={comment.author.role}
                volunteerCount={comment.author.volunteer_count}
                size="sm"
              />
            ) : (
              <span className="text-sm text-muted-foreground">(탈퇴한 회원)</span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          {/* 내용 or 편집 폼 */}
          {editing ? (
            <div className="mt-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={pending || !editContent.trim()}
                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Check className="size-3" />
                  저장
                </button>
                <button
                  type="button"
                  onClick={handleEditCancel}
                  disabled={pending}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <X className="size-3" />
                  취소
                </button>
                <span className="ml-auto text-[10px] text-muted-foreground">{editContent.length}/500</span>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {/* 액션 버튼 */}
          {!editing && (
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
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3" />
                  수정
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
          )}

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
