import Image from "next/image"
import Link from "next/link"
import { Paperclip, Pin } from "lucide-react"
import { UserName } from "@/shared/components/user-name"
import { cn, formatShortDate } from "@/shared/lib/utils"
import { NewPostBadge } from "./new-post-badge"

const textColumns = "sm:grid-cols-[minmax(0,1fr)_4rem_4rem_2.25rem]"
const photoColumns = "sm:grid-cols-[3rem_minmax(0,1fr)_4rem_4rem_2.25rem]"

export function HomePostHeader({ thumbnails = false }: { thumbnails?: boolean }) {
  return <div aria-hidden="true" className={cn("hidden min-h-9 items-center gap-2 border-b border-border bg-muted/50 px-3 text-center text-xs text-muted-foreground sm:grid", thumbnails ? photoColumns : textColumns)}>
    {thumbnails && <span />}
    <span className="text-left">제목</span><span>작성자</span><span>작성일</span><span>조회수</span>
  </div>
}

interface Props {
  href: string
  title: string
  category?: string
  thumbnails?: boolean
  thumbnail?: string | null
  author?: { nickname: string; role: string } | null
  date: string
  viewCount: number
  commentCount: number
  pinned?: boolean
  attachmentCount?: number
}

export function HomePostRow({ href, title, category, thumbnails = false, thumbnail, author, date, viewCount, commentCount, pinned, attachmentCount = 0 }: Props) {
  return <Link href={href} title={title} className={cn("group grid min-h-12 items-center gap-x-2 gap-y-1.5 px-3 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none", thumbnails ? `grid-cols-[3rem_minmax(0,1fr)] ${photoColumns}` : `grid-cols-1 ${textColumns}`)}>
    {thumbnails && <span className="relative row-span-2 block size-12 overflow-hidden rounded-md sm:row-span-1" aria-hidden="true">
      {thumbnail && <Image src={thumbnail} alt="" fill sizes="48px" className="object-cover" />}
    </span>}
    <span className="flex min-w-0 items-center gap-1.5">
      {category && <span className="shrink-0 text-xs text-primary">{category}</span>}
      {pinned && <Pin className="size-3 shrink-0 text-primary" aria-label="상단 고정" />}
      <NewPostBadge date={date} />
      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">{title}</span>
      {commentCount > 0 && <span className="shrink-0 text-xs text-primary">({commentCount})</span>}
      {attachmentCount > 0 && <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-label={`첨부파일 ${attachmentCount}개`} />}
    </span>
    <span className={cn("flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:contents", thumbnails && "col-start-2 sm:col-start-auto")}>
      <span className="min-w-0 max-w-24 overflow-hidden sm:max-w-none sm:text-center" title={author?.nickname ?? "왕왕랜드"}>
        <span className="sr-only">작성자 </span><UserName nickname={author?.nickname ?? "왕왕랜드"} role={author?.role} className="[&>span]:truncate [&>span]:break-normal" />
      </span>
      <span className="shrink-0 whitespace-nowrap tabular-nums sm:text-center"><span className="sr-only">작성일 </span>{formatShortDate(date)}</span>
      <span className="truncate tabular-nums sm:text-center" title={`조회 ${viewCount.toLocaleString()}회`}><span className="sm:sr-only">조회 </span>{viewCount.toLocaleString()}</span>
    </span>
  </Link>
}
