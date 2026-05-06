import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Pin } from "lucide-react"

import { getNotice, getAdjacentNotices, MarkNoticesSeen } from "@/features/notices"
import { getCurrentProfile } from "@/features/members"
import { CommentSection } from "@/features/comments"
import { RichTextContent } from "@/shared/components/rich-text-content"
import { ViewCounter } from "@/shared/components/view-counter"
import { PostNavigation } from "@/shared/components/post-navigation"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const notice = await getNotice(id)
  if (!notice) return { title: "공지를 찾을 수 없습니다" }
  const desc = notice.content.slice(0, 120)
  return {
    title: notice.title,
    description: desc,
    openGraph: {
      title: `${notice.title} · 왕왕랜드 공지`,
      description: desc,
      type: "article",
      publishedTime: notice.published_at ?? undefined,
    },
  }
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [notice, profile] = await Promise.all([
    getNotice(id),
    getCurrentProfile(),
  ])

  if (!notice) notFound()

  const adjacent = notice.published_at
    ? await getAdjacentNotices(id, notice.published_at)
    : { prev: null, next: null }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <MarkNoticesSeen />
      <ViewCounter
        table="notices"
        postId={notice.id}
        authorId={notice.created_by}
        currentUserId={profile?.id ?? null}
      />
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/notice" className="hover:text-foreground">
          ← 공지사항
        </Link>
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        <div className="mb-2 flex items-center gap-2">
          {notice.is_pinned && (
            <Pin className="size-4 text-primary" aria-label="상단 고정" />
          )}
          <span className="text-xs text-muted-foreground">
            {notice.published_at &&
              new Date(notice.published_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">조회 {notice.view_count}</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {notice.title}
        </h1>
      </header>

      <article>
        <RichTextContent html={notice.content} />
      </article>

      <CommentSection postType="notice" postId={notice.id} />

      <PostNavigation basePath="/notice" prev={adjacent.prev} next={adjacent.next} />
    </div>
  )
}
