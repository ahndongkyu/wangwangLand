import Image from "next/image"
import Link from "next/link"

import { RoleBadge } from "@/shared/components/role-badge"
import { extractImagesFromHtml, stripHtml } from "@/shared/lib/utils"
import type { DailyPostWithAuthor } from "../api/queries"

export function DailyCard({ post }: { post: DailyPostWithAuthor }) {
  // images[] 우선, 없으면 본문 HTML에서 첫 번째 이미지 추출
  const cover = post.images[0] ?? extractImagesFromHtml(post.content ?? "")[0] ?? null

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
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {post.title}
        </h3>
        {post.content && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {stripHtml(post.content)}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          {post.author && (
            <>
              <RoleBadge role={post.author.role} />
              <span className="text-xs text-muted-foreground">{post.author.nickname}</span>
            </>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(post.posted_at).toLocaleDateString("ko-KR")}
          </span>
        </div>
      </div>
    </Link>
  )
}
