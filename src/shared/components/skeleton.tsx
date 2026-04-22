import { cn } from "@/shared/lib/utils"

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/** 기본 스켈레톤 블록 — bg-muted + pulse 애니메이션. */
export function Skeleton({ className, ...props }: Props) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden
      {...props}
    />
  )
}

/** 이미지 + 텍스트 구성 카드 스켈레톤. 목록 페이지 용. */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

/** 카드 그리드 스켈레톤. 기본 6개, sm/md/lg 반응형. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/** 리스트 행 스켈레톤. 공지/게시물 등 텍스트 리스트 용. */
export function ListRowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-16" />
        </li>
      ))}
    </ul>
  )
}
