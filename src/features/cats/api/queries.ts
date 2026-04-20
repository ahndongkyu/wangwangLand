import { createClient } from "@/shared/lib/supabase/server"
import type { Cat, DogStatus } from "@/shared/types/database"

export type CatSort = "latest" | "name"

export interface ListCatsOptions {
  status?: DogStatus | "전체"
  sort?: CatSort
  query?: string
  limit?: number
  offset?: number
}

export async function listCats({
  status,
  sort = "latest",
  query: searchQuery,
  limit = 12,
  offset = 0,
}: ListCatsOptions = {}): Promise<Cat[]> {
  const supabase = await createClient()

  let query = supabase.from("cats").select("*")

  if (sort === "name") {
    query = query.order("name", { ascending: true })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("name", `%${searchQuery.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[listCats] error:", error)
    return []
  }

  return (data ?? []) as Cat[]
}

export async function getCat(id: string): Promise<Cat | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getCat] error:", error)
    return null
  }

  return data as Cat | null
}

export async function countCatsByStatus(): Promise<Record<DogStatus, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("cats").select("status")

  const counts: Record<DogStatus, number> = {
    보호중: 0,
    임시보호중: 0,
    입양완료: 0,
    무지개다리: 0,
  }

  if (error || !data) {
    console.error("[countCatsByStatus] error:", error)
    return counts
  }

  for (const row of data as { status: DogStatus }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }

  return counts
}
