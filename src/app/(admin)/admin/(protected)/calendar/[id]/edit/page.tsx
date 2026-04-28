import Link from "next/link"
import { notFound } from "next/navigation"

import { getEventWithMySignup } from "@/features/events"
import { EventForm } from "@/features/events/components/event-form"

export const dynamic = "force-dynamic"

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEventWithMySignup(id)
  if (!event) notFound()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/calendar/${id}`} className="hover:text-foreground">
          ← 일정 상세
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
        일정 수정
      </h1>
      <EventForm event={event} />
    </div>
  )
}
