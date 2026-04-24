import { MessageSquare } from "lucide-react"
import { createClient } from "@/shared/lib/supabase/server"
import { listComments, type PostType, type CommentAuthor } from "../api/queries"
import { CommentItem } from "./comment-item"
import { CommentForm } from "./comment-form"

interface Props {
  postType: PostType
  postId: string
}

export async function CommentSection({ postType, postId }: Props) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let currentUserId: string | null = null
  let currentUserAuthor: CommentAuthor | null = null
  let canComment = false
  let isStaff = false

  if (session) {
    currentUserId = session.user.id
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname, role, avatar_url, status, is_banned")
      .eq("id", session.user.id)
      .maybeSingle()

    if (profile) {
      currentUserAuthor = {
        nickname: profile.nickname,
        role: profile.role,
        avatar_url: profile.avatar_url,
      }
      canComment = profile.status === "approved" && !profile.is_banned
      isStaff = profile.role === "staff" || profile.role === "admin"
    }
  }

  const comments = await listComments(postType, postId)
  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-foreground">
        <MessageSquare className="size-4" />
        댓글
        <span className="text-sm font-normal text-muted-foreground">{totalCount}개</span>
      </h2>

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">첫 번째 댓글을 작성해보세요!</p>
      ) : (
        <div className="mb-8 space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postType={postType}
              postId={postId}
              currentUserId={currentUserId}
              currentUserAuthor={currentUserAuthor}
              isStaff={isStaff}
            />
          ))}
        </div>
      )}

      {/* 댓글 작성 */}
      {canComment && currentUserAuthor ? (
        <CommentForm
          postType={postType}
          postId={postId}
          author={currentUserAuthor}
        />
      ) : !session ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <a href="/login" className="text-primary underline underline-offset-2">로그인</a>하면 댓글을 작성할 수 있어요.
        </p>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          승인된 회원만 댓글을 작성할 수 있어요.
        </p>
      )}
    </section>
  )
}
