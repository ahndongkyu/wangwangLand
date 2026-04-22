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
    query = query.order("name", { ascending: true }).order("id", { ascending: true })
  } else {
    query = query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
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

export interface PaginatedCats {
  cats: Cat[]
  total: number
}

export async function listCatsWithCount({
  status,
  sort = "latest",
  query: searchQuery,
  limit = 20,
  offset = 0,
}: ListCatsOptions = {}): Promise<PaginatedCats> {
  const supabase = await createClient()

  let query = supabase.from("cats").select("*", { count: "exact" })

  if (sort === "name") {
    query = query.order("name", { ascending: true }).order("id", { ascending: true })
  } else {
    query = query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
  }

  query = query.range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("name", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listCatsWithCount] error:", error)
    return { cats: [], total: 0 }
  }

  return { cats: (data ?? []) as Cat[], total: count ?? 0 }
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

/**
 * 고양이 상세 하단 "이런 친구도 있어요" 추천.
 * status IN (보호중, 임시보호중), 자기 자신 제외, 같은 gender 우선.
 */
export async function listSimilarCats(
  current: { id: string; gender: "수컷" | "암컷" | "미상" },
  limit = 4
): Promise<Cat[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .in("status", ["보호중", "임시보호중"])
    .neq("id", current.id)
    .order("updated_at", { ascending: false })
    .limit(40)

  if (error || !data) {
    console.error("[listSimilarCats]", error)
    return []
  }

  const candidates = data as Cat[]

  function score(c: Cat): number {
    let s = 0
    if (c.gender === current.gender && current.gender !== "미상") s += 3
    return s
  }

  return [...candidates]
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
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
