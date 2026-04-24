"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { User } from "lucide-react"
import { createComment } from "../api/actions"
import type { PostType } from "../api/queries"
import type { CommentAuthor } from "../api/queries"
import { useToast } from "@/shared/components/toast"

interface Props {
  postType: PostType
  postId: string
  parentId?: string
  author: CommentAuthor | null
  placeholder?: string
  onDone?: () => void
}

export function CommentForm({ postType, postId, parentId, author, placeholder = "댓글을 입력하세요...", onDone }: Props) {
  const [content, setContent] = useState("")
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toast = useToast()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    startTransition(async () => {
      const res = await createComment(postType, postId, content, parentId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(parentId ? "답글이 등록됐어요." : "댓글이 등록됐어요.")
        setContent("")
        onDone?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      {/* 아바타 */}
      <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {author?.avatar_url ? (
          <Image src={author.avatar_url} alt={author.nickname} fill className="object-cover" />
        ) : (
          <User className="size-full p-1.5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          rows={parentId ? 2 : 3}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
        </div>
        <div className="flex justify-end gap-2">
          {onDone && (
            <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={pending || !content.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </form>
  )
}
