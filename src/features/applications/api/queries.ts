import { createClient } from "@/shared/lib/supabase/server"
import type {
  AdoptionApplication,
  ApplicationStatus,
  VolunteerApplication,
} from "@/shared/types/database"

export interface AdoptionRow extends AdoptionApplication {
  dog?: { id: string; name: string } | null
  cat?: { id: string; name: string } | null
}

interface ListOptions {
  status?: ApplicationStatus | "전체"
  limit?: number
  offset?: number
}

export async function listAdoptionApplications({
  status,
  limit = 20,
  offset = 0,
}: ListOptions = {}): Promise<{ rows: AdoptionRow[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from("adoption_applications")
    .select("*, dog:dogs(id, name), cat:cats(id, name)", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listAdoptionApplications]", error)
    return { rows: [], total: 0 }
  }

  return { rows: (data ?? []) as AdoptionRow[], total: count ?? 0 }
}

export async function listVolunteerApplications({
  status,
  limit = 20,
  offset = 0,
}: ListOptions = {}): Promise<{
  rows: VolunteerApplication[]
  total: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from("volunteer_applications")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listVolunteerApplications]", error)
    return { rows: [], total: 0 }
  }

  return {
    rows: (data ?? []) as VolunteerApplication[],
    total: count ?? 0,
  }
}

export async function getAdoptionApplication(
  id: string
): Promise<AdoptionRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("adoption_applications")
    .select("*, dog:dogs(id, name), cat:cats(id, name)")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getAdoptionApplication]", error)
    return null
  }

  return data as AdoptionRow | null
}

export async function getVolunteerApplication(
  id: string
): Promise<VolunteerApplication | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("volunteer_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getVolunteerApplication]", error)
    return null
  }

  return data as VolunteerApplication | null
}

export async function countPendingApplications(): Promise<{
  adoption: number
  volunteer: number
}> {
  const supabase = await createClient()

  const [{ count: adoption }, { count: volunteer }] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
    supabase
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
  ])

  return { adoption: adoption ?? 0, volunteer: volunteer ?? 0 }
}
