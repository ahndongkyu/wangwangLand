import Image from "next/image"
import Link from "next/link"

import type { DailyPost } from "@/shared/types/database"

export function DailyCard({ post }: { post: DailyPost }) {
  const cover = post.images[0] ?? null

  return (
    <Link
      href={`/daily/${post.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            📷
          </div>
        )}
        {post.images.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            +{post.images.length - 1}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          {new Date(post.posted_at).toLocaleDateString("ko-KR")}
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-foreground">
          {post.title}
        </h3>
        {post.content && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {post.content}
          </p>
        )}
      </div>
    </Link>
  )
}
