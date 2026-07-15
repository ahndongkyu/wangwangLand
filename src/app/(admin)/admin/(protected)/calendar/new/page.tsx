import type { Metadata } from "next"

import { EventForm } from "@/features/events/components/event-form"
import { createAdminClient } from "@/shared/lib/supabase/admin"

export const metadata: Metadata = { title: "새 일정" }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f-]{36}$/i

interface FromApp {
  id: string
  applicantName: string
  partySize: number
  availableDates: string[]
  availableTime: string | null
  activities: string[]
  message: string | null
}

async function loadApplication(id: string): Promise<FromApp | null> {
  if (!UUID_RE.test(id)) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from("volunteer_applications")
    .select(
      "id, applicant_name, party_size, activities, available_dates, available_time, message, status"
    )
    .eq("id", id)
    .maybeSingle()
  if (!data || data.status !== "승인") return null
  return {
    id: data.id,
    applicantName: data.applicant_name,
    partySize: data.party_size ?? 1,
    availableDates: (data.available_dates ?? []) as string[],
    availableTime: data.available_time,
    activities: (data.activities ?? []) as string[],
    message: data.message,
  }
}

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; from?: string }>
}) {
  const { date, from } = await searchParams
  const defaultDate = date && DATE_RE.test(date) ? date : undefined
  const fromApplication = from ? await loadApplication(from) : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">
        {fromApplication ? "봉사 신청에서 일정 등록" : "새 일정 등록"}
      </h1>
      <EventForm
        defaultDate={defaultDate}
        fromApplication={fromApplication ?? undefined}
      />
    </div>
  )
}
