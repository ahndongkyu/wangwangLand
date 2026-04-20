import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface Props {
  currentPage: number
  totalPages: number
  basePath: string
  searchParams?: Record<string, string | undefined>
  className?: string
}

function buildHref(
  basePath: string,
  page: number,
  params: Record<string, string | undefined> = {}
) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue
    if (value != null && value !== "") qs.set(key, value)
  }
  if (page > 1) qs.set("page", String(page))
  const s = qs.toString()
  return s ? `${basePath}?${s}` : basePath
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "…")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push("…")
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push("…")
  pages.push(total)

  return pages
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = {},
  className,
}: Props) {
  if (totalPages <= 1) return null

  const pages = buildPageList(currentPage, totalPages)
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  const itemBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors"

  return (
    <nav
      aria-label="페이지"
      className={cn(
        "mt-6 flex flex-wrap items-center justify-center gap-1.5",
        className
      )}
    >
      <PageLink
        href={
          canPrev ? buildHref(basePath, currentPage - 1, searchParams) : "#"
        }
        disabled={!canPrev}
        aria-label="이전 페이지"
        className={itemBase}
      >
        <ChevronLeft className="size-4" />
      </PageLink>

      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className={cn(itemBase, "border-transparent text-muted-foreground")}
          >
            …
          </span>
        ) : (
          <PageLink
            key={p}
            href={buildHref(basePath, p, searchParams)}
            aria-current={p === currentPage ? "page" : undefined}
            className={cn(
              itemBase,
              p === currentPage
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:bg-secondary"
            )}
          >
            {p}
          </PageLink>
        )
      )}

      <PageLink
        href={
          canNext ? buildHref(basePath, currentPage + 1, searchParams) : "#"
        }
        disabled={!canNext}
        aria-label="다음 페이지"
        className={itemBase}
      >
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  )
}

function PageLink({
  href,
  disabled,
  className,
  children,
  ...rest
}: {
  href: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLAnchorElement>) {
  if (disabled) {
    return (
      <span
        className={cn(
          className,
          "border-border bg-card text-muted-foreground opacity-40"
        )}
        aria-disabled
      >
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={cn(
        className,
        !rest["aria-current"] && "border-border bg-card text-foreground/80 hover:bg-secondary"
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}
