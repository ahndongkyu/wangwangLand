import Link from "next/link"
import { Paperclip, Pin } from "lucide-react"
import { UserName } from "@/shared/components/user-name"
import { cn, formatShortDate } from "@/shared/lib/utils"

const columns = "grid grid-cols-[2.5rem_minmax(0,1fr)_3.25rem_2.5rem_2rem] items-center gap-1 px-2 sm:grid-cols-[4rem_minmax(0,1fr)_6rem_4rem_3.5rem] sm:gap-3 sm:px-4"

export function BoardListHeader() {
  return <div aria-hidden="true" className={cn(columns, "min-h-10 border-b border-border bg-muted text-center text-xs font-medium text-muted-foreground")}>
    <span>유형</span><span className="text-left">제목</span><span>작성자</span><span>작성일</span><span>조회수</span>
  </div>
}

interface Props {
  href: string
  title: string
  category?: string
  author?: { nickname: string; role: string } | null
  date?: string | null
  viewCount?: number
  commentCount?: number
  attachmentCount?: number
  pinned?: boolean
  newAfter?: string | null
}

/** 공개 게시판 공통 한 줄 목록. 긴 제목·작성자는 열 안에서 말줄임한다. */
export function BoardListRow({ href, title, category = "일반", author, date, viewCount = 0, commentCount = 0, attachmentCount = 0, pinned, newAfter }: Props) {
  const published = date ? new Date(date).getTime() : 0
  const fresh = !!published && !!newAfter && published > new Date(newAfter).getTime()
  return <Link href={href} title={title} className={cn(columns, "group min-h-12 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none")}>
    <span className="truncate text-center text-muted-foreground" title={category}><span className="sr-only">유형 </span>{category}</span>
    <span className="flex min-w-0 items-center gap-1">
      {pinned && <Pin className="size-3 shrink-0 text-primary" aria-label="상단 고정" />}
      <span className="truncate text-foreground group-hover:text-primary sm:text-sm">{title}</span>
      {commentCount > 0 && <span className="shrink-0 text-primary">({commentCount})</span>}
      {fresh && <span className="shrink-0 text-primary" aria-label="새 글">N</span>}
      {attachmentCount > 0 && <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-label={`첨부파일 ${attachmentCount}개`} />}
    </span>
    <span className="min-w-0 overflow-hidden text-center" title={author?.nickname ?? "왕왕랜드"}>
      <span className="sr-only">작성자 </span>
      <UserName nickname={author?.nickname ?? "왕왕랜드"} role={author?.role} className="max-w-full [&>span]:truncate [&>span]:break-normal" />
    </span>
    <span className="whitespace-nowrap text-center tabular-nums text-muted-foreground" title={date ?? undefined}><span className="sr-only">작성일 </span>{date ? formatShortDate(date) : "—"}</span>
    <span className="truncate text-center tabular-nums text-muted-foreground" title={`조회 ${viewCount.toLocaleString()}회`}><span className="sr-only">조회수 </span>{viewCount.toLocaleString()}</span>
  </Link>
}
