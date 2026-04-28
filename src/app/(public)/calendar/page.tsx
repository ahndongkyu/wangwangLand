import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, LayoutGrid } from "lucide-react"

import {
  CategoryFilter,
  EventCard,
  listUpcomingEvents,
  type EventCategory,
} from "@/features/events"
import { EmptyState } from "@/shared/components/empty-state"

export const metadata: Metadata = {
  title: "일정",
  description: "왕왕랜드의 봉사·행사 일정을 확인하고 신청해보세요.",
}
export const dynamic = "force-dynamic"

const VALID_CATS: EventCategory[] = ["volunteer", "event", "closed"]

function parseCategories(raw: string | undefined): EventCategory[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim() as EventCategory)
    .filter((c) => VALID_CATS.includes(c))
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const params = await searchParams
  const categories = parseCategories(params.cat)

  const events = await listUpcomingEvents(40, {
    categories: categories.length > 0 ? categories : undefined,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
            <CalendarDays className="size-7 text-primary" aria-hidden />
            일정
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            다가오는 봉사·행사를 확인하고 참여를 신청해 주세요.
          </p>
        </div>
        <Link
          href="/calendar/grid"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LayoutGrid className="size-3.5" aria-hidden />
          캘린더로 보기
        </Link>
      </header>

      <CategoryFilter
        active={categories}
        basePath="/calendar"
      />

      {events.length === 0 ? (
        <EmptyState
          title={
            categories.length > 0
              ? "선택한 카테고리에 해당하는 일정이 없습니다."
              : "예정된 일정이 없습니다."
          }
        />
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  )
}
