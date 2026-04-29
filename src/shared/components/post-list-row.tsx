import Image from "next/image"
import Link from "next/link"
import { Eye, Pin } from "lucide-react"

import { RoleBadge } from "@/shared/components/role-badge"
import { formatShortDate } from "@/shared/lib/utils"

interface Author {
  nickname: string
  /** RoleBadge 가 받을 수 있는 형태. fetch-authors 의 AuthorInfo 와 호환되도록 string. */
  role: string
}

interface Props {
  href: string
  title: string
  /** 우측 상단/제목 옆에 붙는 작은 라벨 (예: 입양 후기의 강아지 이름) */
  subTitle?: string
  /** 썸네일 이미지 URL (없으면 thumbnail 영역 숨김) */
  thumbnail?: string | null
  /** 본문 미리보기 (1줄, 모바일에서는 숨김) */
  excerpt?: string | null
  author?: Author | null
  /** ISO 날짜. */
  date?: string | null
  viewCount?: number
  /** 공지 등 상단 고정 표시 */
  pinned?: boolean
  /** 우측에 표시할 상태 배지 (예: 공개/임시저장). 어드민 리스트에서 사용. */
  statusBadge?: React.ReactNode
  /** 발행일이 N일 이내면 NEW 뱃지(반짝거리는 효과). 0 이면 비활성. 기본 0. */
  newWithinDays?: number
}

function isNew(date: string | null | undefined, withinDays: number): boolean {
  if (!date || withinDays <= 0) return false
  const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= withinDays
}

/**
 * 공지/일상/입양후기 리스트 공통 행.
 * 모바일/데스크탑 동일 레이아웃: [썸네일] [제목·요약·메타]
 */
export function PostListRow({
  href,
  title,
  subTitle,
  thumbnail,
  excerpt,
  author,
  date,
  viewCount,
  pinned,
  statusBadge,
  newWithinDays = 0,
}: Props) {
  const fresh = isNew(date, newWithinDays)
  return (
    <Link
      href={href}
      className="flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-secondary/50 sm:gap-4 sm:px-5 sm:py-4"
    >
      {/* 썸네일 (있을 때만) */}
      {thumbnail ? (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted sm:size-20">
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 640px) 64px, 80px"
            className="object-cover"
          />
        </div>
      ) : pinned ? (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-primary/10 sm:size-20">
          <Pin className="size-5 text-primary" aria-label="상단 고정" />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        {/* 제목 + 부제 */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {pinned && thumbnail && (
              <Pin className="size-3.5 shrink-0 text-primary" aria-label="상단 고정" />
            )}
            {fresh && (
              <span className="animate-new-shine shrink-0 rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary-foreground">
                NEW
              </span>
            )}
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
              {title}
            </h3>
            {statusBadge && (
              <span className="shrink-0">{statusBadge}</span>
            )}
          </div>
          {subTitle && (
            <p className="mt-0.5 truncate text-xs font-medium text-primary/80">
              {subTitle}
            </p>
          )}
          {excerpt && (
            <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
              {excerpt}
            </p>
          )}
        </div>

        {/* 메타 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {author && (
            <span className="flex items-center gap-1">
              <RoleBadge role={author.role} />
              <span className="font-medium text-foreground/80">
                {author.nickname}
              </span>
            </span>
          )}
          {date && (
            <>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span>{formatShortDate(date)}</span>
            </>
          )}
          {typeof viewCount === "number" && (
            <>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Eye className="size-3" aria-hidden />
                {viewCount}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
