import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, LayoutGrid } from "lucide-react"

import {
  EventCard,
  listMyUpcomingEvents,
  listUpcomingEvents,
  type EventWithSignupCount,
} from "@/features/events"
import { createClient } from "@/shared/lib/supabase/server"

export const metadata: Metadata = {
  title: "일정",
  description: "왕왕랜드의 봉사·행사 일정을 확인하고 신청해보세요.",
}
export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 로그인 사용자 → 본인이 신청한 일정만 (마스킹 안 함, 본인 일정이라 OK)
  // 게스트 → 다가오는 전체 일정 (마스킹)
  let events: EventWithSignupCount[] = []
  let isMember = false
  if (session?.user) {
    isMember = true
    const myEvents = await listMyUpcomingEvents()
    events = myEvents.map((e) => ({ ...e, signup_count: 0 }))
  } else {
    events = await listUpcomingEvents(40)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
            <CalendarDays className="size-7 text-primary" aria-hidden />
            {isMember ? "내 일정" : "일정"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isMember
              ? "내가 신청한 봉사·행사 일정입니다. 전체 일정은 캘린더에서 확인하세요."
              : "다가오는 봉사·행사를 확인하고 참여를 신청해 주세요."}
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

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {isMember
              ? "아직 신청한 일정이 없습니다."
              : "예정된 일정이 없습니다."}
          </p>
          {isMember && (
            <Link
              href="/calendar/grid"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              <LayoutGrid className="size-3.5" aria-hidden />
              전체 일정 보러가기
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            // 본인 신청 일정은 마스킹 안 함 (본인 정보 본인이 보는 거라 OK).
            // 게스트일 때만 마스킹.
            <EventCard key={ev.id} event={ev} maskNames={!isMember} />
          ))}
        </div>
      )}
    </div>
  )
}
