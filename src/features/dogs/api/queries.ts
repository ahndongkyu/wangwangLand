import { createClient } from "@/shared/lib/supabase/server"
import type { Dog, DogStatus } from "@/shared/types/database"

export interface ListDogsOptions {
  status?: DogStatus | "전체"
  limit?: number
  offset?: number
}

export async function listDogs({
  status,
  limit = 12,
  offset = 0,
}: ListDogsOptions = {}): Promise<Dog[]> {
  const supabase = await createClient()

  let query = supabase
    .from("dogs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("[listDogs] error:", error)
    return []
  }

  return (data ?? []) as Dog[]
}

export async function getDog(id: string): Promise<Dog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getDog] error:", error)
    return null
  }

  return data as Dog | null
}

export async function countDogsByStatus(): Promise<Record<DogStatus, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("dogs")
    .select("status")

  const counts: Record<DogStatus, number> = {
    보호중: 0,
    임시보호중: 0,
    입양완료: 0,
    무지개다리: 0,
  }

  if (error || !data) {
    console.error("[countDogsByStatus] error:", error)
    return counts
  }

  for (const row of data as { status: DogStatus }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }

  return counts
}
