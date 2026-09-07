import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, LayoutGrid } from "lucide-react"

import {
  EventCard,
  listMyUpcomingEvents,
  type EventWithSignupCount,
} from "@/features/events"
import { createClient } from "@/shared/lib/supabase/server"

export const metadata: Metadata = {
  title: "내 일정",
  description: "내가 신청한 왕왕랜드 봉사·행사 일정을 확인하세요.",
}
export const dynamic = "force-dynamic"

export default async function MyCalendarListPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) redirect("/login")

  const myEvents = await listMyUpcomingEvents()
  const events: EventWithSignupCount[] = myEvents.map((event) => ({
    ...event,
    signup_count: 0,
  }))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
            <CalendarDays className="size-7 text-primary" aria-hidden />
            내 일정
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            내가 신청한 봉사·행사 일정입니다.
          </p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LayoutGrid className="size-3.5" aria-hidden />
          캘린더로 보기
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            아직 신청한 일정이 없습니다.
          </p>
          <Link
            href="/calendar"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            <LayoutGrid className="size-3.5" aria-hidden />
            전체 일정 보러가기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} maskNames={false} />
          ))}
        </div>
      )}
    </div>
  )
}
