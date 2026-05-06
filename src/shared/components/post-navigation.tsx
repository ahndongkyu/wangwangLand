import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface AdjacentPost {
  id: string
  title: string
}

interface Props {
  /** 목록 페이지 경로 (예: "/notice") */
  basePath: string
  /** 이전 글 (현재보다 먼저 발행된 글) */
  prev: AdjacentPost | null
  /** 다음 글 (현재보다 나중에 발행된 글) */
  next: AdjacentPost | null
}

/**
 * 상세 페이지 하단의 이전/다음 글 내비게이션.
 * prev = 이전 글 (더 오래된), next = 다음 글 (더 최신)
 */
export function PostNavigation({ basePath, prev, next }: Props) {
  if (!prev && !next) return null

  return (
    <nav className="mt-10 overflow-hidden rounded-lg border border-border" aria-label="글 탐색">
      <div className="divide-y divide-border">
        {next && (
          <Link
            href={`${basePath}/${next.id}`}
            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary/50"
          >
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <ChevronLeft className="size-3.5" />
              다음 글
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {next.title}
            </span>
          </Link>
        )}
        {prev && (
          <Link
            href={`${basePath}/${prev.id}`}
            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary/50"
          >
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <ChevronRight className="size-3.5" />
              이전 글
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {prev.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  )
}
