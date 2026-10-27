import Link from "next/link"
import { notFound } from "next/navigation"

import { getEventWithMySignup, listRecurrenceGroupDates } from "@/features/events"
import { EventForm } from "@/features/events/components/event-form"
import { eventEditReturnHref } from "@/features/applications/lib/detail-navigation"
import { createClient } from "@/shared/lib/supabase/server"

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
  const client = await createClient()
  const { data: settings, error } = await client.from("events").select("application_block").eq("id", id).single()
  if (error) throw new Error("일정 제한 설정을 불러오지 못했습니다.")
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
      <EventForm event={event} applicationBlock={settings.application_block} groupDates={groupDates} returnHref={returnHref} />
    </div>
  )
}
