import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Pencil } from "lucide-react"

import { getAdoptionStory, getAdjacentStories, StoryDeleteButton } from "@/features/stories"
import { getCurrentProfile } from "@/features/members"
import { CommentSection } from "@/features/comments"
import { RichTextContent } from "@/shared/components/rich-text-content"
import { RoleBadge } from "@/shared/components/role-badge"
import { ViewCounter } from "@/shared/components/view-counter"
import { PostNavigation } from "@/shared/components/post-navigation"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const story = await getAdoptionStory(id)
  if (!story) return { title: "찾을 수 없는 입양 후기" }
  const desc = story.content.slice(0, 120)
  const cover = story.images[0]
  return {
    title: story.title,
    description: desc,
    openGraph: {
      title: `${story.title} · 입양 후기`,
      description: desc,
      type: "article",
      publishedTime: story.published_at ?? undefined,
      images: cover ? [{ url: cover, width: 1200, height: 630, alt: story.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${story.title} · 입양 후기`,
      description: desc,
      images: cover ? [cover] : undefined,
    },
  }
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [story, profile] = await Promise.all([
    getAdoptionStory(id),
    getCurrentProfile(),
  ])

  if (!story) notFound()

  const adjacent = story.published_at
    ? await getAdjacentStories(id, story.published_at)
    : { prev: null, next: null }

  const isStaff = profile?.role === "staff" || profile?.role === "admin"
  const isAuthor = profile?.id === story.created_by
  const canEdit = isAuthor || isStaff
  const editHref = isStaff ? `/admin/stories/${id}/edit` : `/stories/${id}/edit`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <ViewCounter
        table="adoption_stories"
        postId={story.id}
        authorId={story.created_by}
        currentUserId={profile?.id ?? null}
      />
      <nav className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <Link href="/stories" className="hover:text-foreground">
          ← 입양 후기 목록
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
            <StoryDeleteButton id={id} title={story.title} redirectTo="/stories" />
          </div>
        )}
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        {story.dog && (
          <p className="flex items-center gap-1 text-sm font-semibold text-primary">
            <img src="/images/icons/status/dog-happy.svg" alt="" className="size-4" />
            {story.dog.name}의 이야기
          </p>
        )}
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          {story.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {story.author && (
            <span className="flex items-center gap-1.5">
              <RoleBadge role={story.author.role} />
              <span>{story.author.nickname}</span>
            </span>
          )}
          {story.published_at && (
            <span>
              {new Date(story.published_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <span>·</span>
          <span>조회 {story.view_count}</span>
        </div>
      </header>

      <article>
        <RichTextContent html={story.content} />
      </article>

      <CommentSection postType="story" postId={story.id} />

      <PostNavigation basePath="/stories" prev={adjacent.prev} next={adjacent.next} />

      {story.dog && (
        <div className="mt-10 rounded-lg border border-border bg-secondary/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">이 이야기의 주인공</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-lg font-bold text-foreground">
            <img src="/images/icons/status/dog-happy.svg" alt="" className="size-5" />
            {story.dog.name}
          </p>
          <Link
            href={`/dogs/${story.dog.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4"
            )}
          >
            {story.dog.name} 프로필 보기 →
          </Link>
        </div>
      )}
    </div>
  )
}
