import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Heart, Package } from "lucide-react"

import { getDonationThanks } from "@/features/thanks"
import { RichTextContent } from "@/shared/components/rich-text-content"
import { formatShortDate, stripHtml } from "@/shared/lib/utils"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getDonationThanks(id)
  if (!post || !post.published_at) return { title: "감사글" }
  const cover = post.images[post.thumbnail_index] ?? post.images[0]
  const desc = stripHtml(post.content).slice(0, 120)
  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: `${post.title} · 왕왕랜드`,
      description: desc,
      type: "article",
      images: cover ? [{ url: cover, width: 1200, height: 630 }] : undefined,
    },
  }
}

export default async function ThanksDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getDonationThanks(id)
  if (!post || !post.published_at) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/thanks" className="hover:text-foreground">
          ← 후원 감사글
        </Link>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            <Heart className="size-3" aria-hidden />
            후원 감사
          </span>
          <span>{formatShortDate(post.published_at!)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
          {post.title}
        </h1>
        {(post.donor_display_name || post.donation_summary) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {post.donor_display_name && (
              <span className="text-primary/80">
                <strong>{post.donor_display_name}</strong> 님
              </span>
            )}
            {post.donation_summary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground/80">
                <Package className="size-3" aria-hidden />
                {post.donation_summary}
              </span>
            )}
          </div>
        )}
      </header>

      <article>
        <RichTextContent html={post.content} />
      </article>

      <div className="mt-12 rounded-lg border border-primary/30 bg-primary/5 p-5 text-center">
        <p className="text-sm text-foreground">
          <strong>왕왕랜드</strong>는 작은 마음 하나하나로 살아갑니다.
        </p>
        <Link
          href="/donate"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Heart className="size-4" aria-hidden />
          후원하기
        </Link>
      </div>
    </div>
  )
}
