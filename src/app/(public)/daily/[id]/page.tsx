import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Pencil } from "lucide-react"

import { getDailyPost, getAdjacentDailyPosts, DailyDeleteButton } from "@/features/daily"
import { getCurrentProfile } from "@/features/members"
import { CommentSection } from "@/features/comments"
import { RichTextContent } from "@/shared/components/rich-text-content"
import { UserName } from "@/shared/components/user-name"
import { ViewCounter } from "@/shared/components/view-counter"
import { PostNavigation } from "@/shared/components/post-navigation"
import { ShareButton } from "@/shared/components/share-button"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getDailyPost(id)
  if (!post) return { title: "찾을 수 없는 일상" }
  const desc = post.content?.slice(0, 120) ?? post.title
  const cover = post.images[0]
  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: `${post.title} · 왕왕랜드 일상`,
      description: desc,
      type: "article",
      publishedTime: post.posted_at,
      images: cover ? [{ url: cover, width: 1200, height: 630, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} · 왕왕랜드 일상`,
      description: desc,
      images: cover ? [cover] : undefined,
    },
  }
}

export default async function DailyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [post, profile] = await Promise.all([
    getDailyPost(id),
    getCurrentProfile(),
  ])

  if (!post) notFound()

  const adjacent = await getAdjacentDailyPosts(id, post.posted_at)

  const isStaff = profile?.role === "staff" || profile?.role === "admin"
  const isAuthor = profile?.id === post.created_by
  const canEdit = isAuthor || isStaff
  // staff는 admin 수정 페이지로, 일반 작성자는 public 수정 페이지로
  const editHref = isStaff ? `/admin/daily/${id}/edit` : `/daily/${id}/edit`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <ViewCounter
        table="daily_posts"
        postId={post.id}
        authorId={post.created_by}
        currentUserId={profile?.id ?? null}
      />
      <nav className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <Link href="/daily" className="hover:text-foreground">
          ← 일상 목록
        </Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Pencil className="size-3.5" />
              수정
            </Link>
            <DailyDeleteButton id={id} title={post.title} redirectTo="/daily" />
          </div>
        )}
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {post.author && (
            <UserName
              nickname={post.author.nickname}
              role={post.author.role}
              volunteerCount={post.author.volunteer_count}
            />
          )}
          <span>
            {new Date(post.posted_at).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </span>
          <span>·</span>
          <span>조회 {post.view_count}</span>
        </div>
      </header>

      {post.content && (
        <article>
          <RichTextContent html={post.content} />
        </article>
      )}

      <div className="mt-8 flex justify-center">
        <ShareButton
          title={post.title}
          text={`${post.title} - 왕왕랜드 일상`}
          path={`/daily/${post.id}`}
          label="공유하기"
        />
      </div>

      <CommentSection postType="daily" postId={post.id} />

      <PostNavigation basePath="/daily" prev={adjacent.prev} next={adjacent.next} />
    </div>
  )
}
