import { createClient } from "@/shared/lib/supabase/server"
import type { Dog, DogSize, DogStatus } from "@/shared/types/database"

export type DogSort = "latest" | "name"

export interface ListDogsOptions {
  status?: DogStatus | "전체"
  size?: DogSize | "전체"
  sort?: DogSort
  query?: string
  limit?: number
  offset?: number
}

export async function listDogs({
  status,
  size,
  sort = "latest",
  query: searchQuery,
  limit = 12,
  offset = 0,
}: ListDogsOptions = {}): Promise<Dog[]> {
  const supabase = await createClient()

  let query = supabase.from("dogs").select("*")

  if (sort === "name") {
    query = query.order("name", { ascending: true })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }
  if (size && size !== "전체") {
    query = query.eq("size", size)
  }
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("name", `%${searchQuery.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[listDogs] error:", error)
    return []
  }

  return (data ?? []) as Dog[]
}

export interface PaginatedDogs {
  dogs: Dog[]
  total: number
}

export async function listDogsWithCount({
  status,
  size,
  sort = "latest",
  query: searchQuery,
  limit = 20,
  offset = 0,
}: ListDogsOptions = {}): Promise<PaginatedDogs> {
  const supabase = await createClient()

  let query = supabase.from("dogs").select("*", { count: "exact" })

  if (sort === "name") {
    query = query.order("name", { ascending: true })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  if (status && status !== "전체") {
    query = query.eq("status", status)
  }
  if (size && size !== "전체") {
    query = query.eq("size", size)
  }
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("name", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listDogsWithCount] error:", error)
    return { dogs: [], total: 0 }
  }

  return { dogs: (data ?? []) as Dog[], total: count ?? 0 }
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

  const { data, error } = await supabase.from("dogs").select("status")

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

export async function countDogsBySize(): Promise<Record<DogSize | "미분류", number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("dogs")
    .select("size")
    .in("status", ["보호중", "임시보호중"])

  const counts: Record<DogSize | "미분류", number> = {
    소: 0,
    중소: 0,
    중: 0,
    중대: 0,
    대: 0,
    대대: 0,
    미분류: 0,
  }

  if (error || !data) {
    console.error("[countDogsBySize] error:", error)
    return counts
  }

  for (const row of data as { size: DogSize | null }[]) {
    if (row.size) counts[row.size] += 1
    else counts["미분류"] += 1
  }

  return counts
}
