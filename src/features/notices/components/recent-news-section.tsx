import Link from "next/link"

import { stripHtml } from "@/shared/lib/utils"
import type { NoticeWithAuthor } from "../api/queries"

const TAG_STYLES: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  notice:  { label: "공지",   bg: "bg-[#FAEEDA] dark:bg-[#3B2A12]", color: "text-[#854F0B] dark:text-[#E6B97A]" },
  event:   { label: "이벤트", bg: "bg-[#FAECE7] dark:bg-[#3B1F18]", color: "text-[#993C1D] dark:text-[#E89B6C]" },
  recruit: { label: "모집",   bg: "bg-[#EAF3DE] dark:bg-[#1F2E14]", color: "text-[#3B6D11] dark:text-[#B5D687]" },
  info:    { label: "안내",   bg: "bg-[#E6F1FB] dark:bg-[#152334]", color: "text-[#185FA5] dark:text-[#7EB6E8]" },
}

type CategoryKey = keyof typeof TAG_STYLES

/**
 * 제목 prefix("[공지]", "[행사]" 등)에서 카테고리 + 표시 라벨을 추출.
 *  - 매핑된 prefix(공지/이벤트/모집/안내)면 정해진 라벨·색상 사용
 *  - 그 외 직접입력은 입력한 텍스트 그대로 라벨에 노출, 색상은 안내 톤 fallback
 */
function detectCategory(title: string): {
  category: CategoryKey
  customLabel: string | null
  cleanTitle: string
} {
  const match = title.match(/^\[([^\]]+)\]\s*/)
  if (!match) return { category: "info", customLabel: null, cleanTitle: title }
  const tag = match[1].trim()
  const cleanTitle = title.slice(match[0].length)
  if (tag === "공지") return { category: "notice", customLabel: null, cleanTitle }
  if (tag === "이벤트") return { category: "event", customLabel: null, cleanTitle }
  if (tag === "모집") return { category: "recruit", customLabel: null, cleanTitle }
  if (tag === "안내") return { category: "info", customLabel: null, cleanTitle }
  // 매핑 안 된 직접입력 — 입력값 그대로 라벨에 노출
  return { category: "info", customLabel: tag, cleanTitle }
}

const NEW_THRESHOLD_DAYS = 2

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false
  const diff = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= NEW_THRESHOLD_DAYS
}

function formatFullDate(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}. ${mm}. ${dd}`
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${mm}. ${dd}`
}

interface Props {
  notices: NoticeWithAuthor[]
}

export function RecentNewsSection({ notices }: Props) {
  if (notices.length === 0) return null
  const items = notices.slice(0, 4)

  return (
    <section
      className="border-t border-border/60 bg-background"
      aria-labelledby="news-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 2xl:max-w-7xl">
        {/* 헤더 */}
        <header className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2
              id="news-heading"
              className="text-2xl font-bold text-foreground md:text-3xl"
            >
              최근 소식
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              왕왕랜드의 최신 안내·이벤트입니다.
            </p>
          </div>
          <Link
            href="/notice"
            className="shrink-0 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            전체 공지 →
          </Link>
        </header>

        {/* 그리드: 모바일 1열 / sm 2열 / lg 4열 */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {items.map((n) => {
            const { category, customLabel, cleanTitle } = detectCategory(n.title)
            const tag = TAG_STYLES[category]
            const label = customLabel ?? tag.label
            const fresh = isNew(n.published_at)
            const summary = n.content
              ? stripHtml(n.content).slice(0, 80)
              : ""
            return (
              <Link
                key={n.id}
                href={`/notice/${n.id}`}
                className="group flex min-h-0 flex-col rounded-xl border border-black/[0.08] bg-card p-3.5 transition-all hover:border-primary/30 hover:bg-card sm:min-h-[120px] sm:p-4 dark:border-white/10 dark:hover:border-primary/40
                  hover:-translate-y-0 sm:hover:-translate-y-0.5 sm:hover:shadow-[0_4px_12px_rgba(216,90,48,0.08)]"
              >
                {/* head: 카테고리 / NEW / (모바일 날짜) */}
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tag.bg} ${tag.color}`}
                  >
                    {label}
                  </span>
                  {fresh && (
                    <span className="animate-new-shine rounded-[3px] bg-primary px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary-foreground">
                      NEW
                    </span>
                  )}
                  {/* 모바일에서만 head 우측에 짧은 날짜 */}
                  {n.published_at && (
                    <span className="ml-auto text-[10px] text-muted-foreground sm:hidden">
                      {formatShortDate(n.published_at)}
                    </span>
                  )}
                </div>

                {/* 제목 */}
                <h3 className="line-clamp-1 text-[13px] font-medium leading-snug text-foreground sm:line-clamp-2">
                  {cleanTitle}
                </h3>

                {/* 요약 */}
                {summary && (
                  <p className="mb-0 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground sm:mb-auto sm:mt-1.5 sm:line-clamp-2">
                    {summary}
                  </p>
                )}

                {/* 데스크톱 날짜 (카드 하단) */}
                {n.published_at && (
                  <p className="mt-3 hidden text-[11px] text-muted-foreground/70 sm:block">
                    {formatFullDate(n.published_at)}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
