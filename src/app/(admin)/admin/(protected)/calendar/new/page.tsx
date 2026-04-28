import type { Metadata } from "next"
import Link from "next/link"

import { EventForm } from "@/features/events/components/event-form"

export const metadata: Metadata = { title: "새 일정" }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const defaultDate = date && DATE_RE.test(date) ? date : undefined

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/calendar" className="hover:text-foreground">
          ← 일정 관리
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
        새 일정 등록
      </h1>
      <EventForm defaultDate={defaultDate} />
    </div>
  )
}
