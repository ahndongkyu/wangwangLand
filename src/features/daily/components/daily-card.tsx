import Image from "next/image"
import Link from "next/link"

import { UserName } from "@/shared/components/user-name"
import { extractImagesFromHtml, stripHtml } from "@/shared/lib/utils"
import type { DailyPostWithAuthor } from "../api/queries"

function truncateText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function DailyCard({ post }: { post: DailyPostWithAuthor }) {
  // images[] 우선, 없으면 본문 HTML에서 첫 번째 이미지 추출
  const cover = post.images[0] ?? extractImagesFromHtml(post.content ?? "")[0] ?? null
  const title = truncateText(post.title, 28)
  const preview = truncateText(stripHtml(post.content ?? ""), 64)
  const authorNickname = post.author
    ? truncateText(post.author.nickname, 12)
    : ""

  return (
    <Link
      href={`/daily/${post.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
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
      <div className="flex flex-1 flex-col p-4">
        <p
          className={`mb-1.5 h-4 truncate text-xs font-semibold text-primary/80 ${
            post.category ? "" : "invisible"
          }`}
          aria-hidden={!post.category}
        >
          {post.category ?? "카테고리"}
        </p>
        <h3 className="line-clamp-2 h-12 text-base font-semibold leading-6 text-foreground">
          {title}
        </h3>
        <p
          className={`mt-2 line-clamp-2 h-10 text-sm leading-5 text-muted-foreground ${
            preview ? "" : "invisible"
          }`}
          aria-hidden={!preview}
        >
          {preview || "미리보기 내용 없음"}
        </p>
        <div className="mt-auto flex flex-col gap-1 pt-3">
          <div className="h-5 overflow-hidden">
            {post.author ? (
              <UserName
                nickname={authorNickname}
                role={post.author.role}
                volunteerCount={post.author.volunteer_count}
                className="max-w-full overflow-hidden"
              />
            ) : (
              <span className="invisible text-xs" aria-hidden>
                작성자
              </span>
            )}
          </div>
          <span className="h-4 text-xs leading-4 text-muted-foreground">
            {new Date(post.posted_at).toLocaleDateString("ko-KR")}
          </span>
        </div>
      </div>
    </Link>
  )
}
