import Image from "next/image"
import Link from "next/link"
import { UserName } from "@/shared/components/user-name"
import { formatShortDate } from "@/shared/lib/utils"
import { SITE } from "@/shared/constants/site"
import { NewPostBadge } from "./new-post-badge"

interface Props {
  href: string
  title: string
  category: string
  thumbnail?: string | null
  author?: { nickname: string; role: string } | null
  date: string
  viewCount: number
  commentCount: number
}

export function HomeStoryCard({ href, title, category, thumbnail, author, date, viewCount, commentCount }: Props) {
  return (
    <Link href={href} className="group grid min-w-0 grid-cols-[28%_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:flex md:flex-col md:gap-0 md:overflow-hidden md:p-0">
      <span className="relative block aspect-[4/3] w-full self-start overflow-hidden rounded-lg bg-secondary md:rounded-none" aria-hidden="true">
        {thumbnail ? <Image src={thumbnail} alt="" fill sizes="(min-width: 1440px) 340px, (min-width: 768px) 30vw, 28vw" className="object-cover" /> : (
          <span className="absolute inset-0 flex items-center justify-center bg-muted">
            <span
              className="block aspect-[1.53/1] w-[42%] bg-left bg-no-repeat opacity-30 grayscale dark:opacity-40 dark:invert"
              style={{ backgroundImage: `url(${SITE.headerLogo})`, backgroundSize: "196.08% 100%" }}
            />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col md:p-4">
        <span className="mb-1 text-xs font-medium text-primary md:mb-2">{category}</span>
        <span className="mb-3 flex min-h-10 min-w-0 items-start gap-1.5 md:min-h-12">
          <NewPostBadge date={date} />
          <span className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 text-foreground group-hover:text-primary md:text-base md:leading-6" title={title}>{title}{commentCount > 0 && <span className="ml-1 text-xs font-medium text-primary">({commentCount})</span>}</span>
        </span>
        <span className="mt-auto grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-[11px] text-muted-foreground md:text-xs">
          <span className="min-w-0 overflow-hidden" title={author?.nickname ?? "왕왕랜드"}><span className="sr-only">작성자 </span><UserName nickname={author?.nickname ?? "왕왕랜드"} role={author?.role} className="[&>span]:truncate [&>span]:break-normal" /></span>
          <span className="whitespace-nowrap tabular-nums"><span className="sr-only">작성일 </span>{formatShortDate(date)}</span>
          <span className="max-w-20 truncate whitespace-nowrap tabular-nums" title={`조회 ${viewCount.toLocaleString()}회`}>조회 {viewCount.toLocaleString()}</span>
        </span>
      </span>
    </Link>
  )
}
