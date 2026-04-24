import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getDailyPost } from "@/features/daily"
import { CommentSection } from "@/features/comments"
import { PhotoGallery } from "@/shared/components/photo-gallery"
import { RichTextContent } from "@/shared/components/rich-text-content"

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
  const post = await getDailyPost(id)

  if (!post) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/daily" className="hover:text-foreground">
          ← 일상 목록
        </Link>
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs text-muted-foreground">
          {new Date(post.posted_at).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          {post.title}
        </h1>
      </header>

      <div className="mb-8">
        <PhotoGallery
          images={post.images}
          alt={post.title}
          fallback="📷"
        />
      </div>

      {post.content && (
        <article>
          <RichTextContent html={post.content} />
        </article>
      )}

      <CommentSection postType="daily" postId={post.id} />
    </div>
  )
}
