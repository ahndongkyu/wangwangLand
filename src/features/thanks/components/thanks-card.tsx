import Image from "next/image"
import Link from "next/link"
import { Heart, Package } from "lucide-react"

import type { DonationThanks } from "../types"
import { stripHtml } from "@/shared/lib/utils"

export function ThanksCard({ post }: { post: DonationThanks }) {
  const thumbnail =
    post.images[post.thumbnail_index] ?? post.images[0] ?? null
  const excerpt = stripHtml(post.content).slice(0, 60)

  return (
    <Link
      href={`/thanks/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Heart className="size-10 text-primary/40" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base">
          {post.title}
        </h3>
        {post.donation_summary && (
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Package className="size-3" aria-hidden />
            {post.donation_summary}
          </p>
        )}
        {excerpt && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {excerpt}
          </p>
        )}
        {post.donor_display_name && (
          <p className="mt-auto text-[11px] font-medium text-primary/80">
            — {post.donor_display_name} 님
          </p>
        )}
      </div>
    </Link>
  )
}
