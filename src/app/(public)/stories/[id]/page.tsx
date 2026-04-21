import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getAdoptionStory } from "@/features/stories"
import { PhotoGallery } from "@/shared/components/photo-gallery"
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
  return {
    title: story.title,
    description: story.content.slice(0, 120),
  }
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const story = await getAdoptionStory(id)

  if (!story) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/stories" className="hover:text-foreground">
          ← 입양 후기 목록
        </Link>
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        {story.dog && (
          <p className="text-sm font-semibold text-primary">
            🐶 {story.dog.name}의 이야기
          </p>
        )}
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          {story.title}
        </h1>
        {story.published_at && (
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(story.published_at).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </header>

      <div className="mb-8">
        <PhotoGallery images={story.images} alt={story.title} fallback="💕" />
      </div>

      <article className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
        {story.content}
      </article>

      {story.dog && (
        <div className="mt-10 rounded-lg border border-border bg-secondary/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">이 이야기의 주인공</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            🐶 {story.dog.name}
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
