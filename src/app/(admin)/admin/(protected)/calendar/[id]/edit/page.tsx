import Link from "next/link"
import { notFound } from "next/navigation"

import { getEventWithMySignup, listRecurrenceGroupDates } from "@/features/events"
import { EventForm } from "@/features/events/components/event-form"
import { eventEditReturnHref } from "@/features/applications/lib/detail-navigation"

export const dynamic = "force-dynamic"

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const { id } = await params
  const event = await getEventWithMySignup(id)
  if (!event) notFound()
  const returnHref = eventEditReturnHref((await searchParams).returnTo, id)

  const groupDates = event.recurrence_group_id
    ? await listRecurrenceGroupDates(event.recurrence_group_id)
    : []

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={returnHref} className="hover:text-foreground">
          ← {returnHref.startsWith("/admin/applications/") ? "봉사 신청 상세" : "일정 상세"}
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
        일정 수정
      </h1>
      <EventForm event={event} groupDates={groupDates} returnHref={returnHref} />
    </div>
  )
}
