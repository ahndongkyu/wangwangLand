import { createClient } from "@/shared/lib/supabase/server"
import type { Dog, DogGender, DogSize, DogStatus } from "@/shared/types/database"

export type DogSort = "latest" | "name"

export interface ListDogsOptions {
  status?: DogStatus | "전체"
  size?: DogSize | "전체"
  gender?: DogGender | "전체"
  neutered?: "true" | "false" | "전체"
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
    query = query.order("name", { ascending: true }).order("id", { ascending: true })
  } else {
    // 최신순 = 최근 업데이트된 순. id를 2차 정렬키로 걸어 동률 안정화.
    query = query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
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
  gender,
  neutered,
  sort = "latest",
  query: searchQuery,
  limit = 20,
  offset = 0,
}: ListDogsOptions = {}): Promise<PaginatedDogs> {
  const supabase = await createClient()

  let query = supabase.from("dogs").select("*", { count: "exact" })

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
  if (size && size !== "전체") {
    query = query.eq("size", size)
  }
  if (gender && gender !== "전체") {
    query = query.eq("gender", gender)
  }
  if (neutered === "true") {
    query = query.eq("neutered", true)
  } else if (neutered === "false") {
    query = query.eq("neutered", false)
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim()
    query = query.or(`name.ilike.%${q}%,breed.ilike.%${q}%`)
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

/**
 * 강아지 상세 하단 "이런 친구도 있어요" 추천.
 * 대상: status IN (보호중, 임시보호중), 자기 자신 제외.
 * 우선순위: 같은 size 와 같은 gender 가 상위. 그 외는 최근 업데이트 순.
 */
export async function listSimilarDogs(
  current: {
    id: string
    size: DogSize | null
    gender: "수컷" | "암컷" | "미상"
  },
  limit = 4
): Promise<Dog[]> {
  const supabase = await createClient()

  // 충분히 후보를 넉넉하게 뽑아 클라이언트에서 점수화.
  const { data, error } = await supabase
    .from("dogs")
    .select("*")
    .in("status", ["보호중", "임시보호중"])
    .neq("id", current.id)
    .order("updated_at", { ascending: false })
    .limit(40)

  if (error || !data) {
    console.error("[listSimilarDogs]", error)
    return []
  }

  const candidates = data as Dog[]

  function score(d: Dog): number {
    let s = 0
    if (current.size && d.size === current.size) s += 10
    if (d.gender === current.gender && current.gender !== "미상") s += 3
    // 최근 업데이트 가산점 (인덱스 위치 역순 → 최신 약간 우위)
    return s
  }

  return [...candidates]
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
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

export interface MonthlyRescueStat {
  month: string  // "YYYY-MM"
  label: string  // "1월"
  rescued: number
}

/** 최근 N개월 구조 추이 (rescue_date 기준) */
export async function getMonthlyRescueStats(months = 6): Promise<MonthlyRescueStat[]> {
  const supabase = await createClient()

  const since = new Date()
  since.setMonth(since.getMonth() - months + 1)
  since.setDate(1)
  const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-01`

  const { data, error } = await supabase
    .from("dogs")
    .select("rescue_date")
    .gte("rescue_date", sinceStr)
    .not("rescue_date", "is", null)

  if (error || !data) return []

  const map = new Map<string, number>()
  for (const { rescue_date } of data as { rescue_date: string }[]) {
    const key = rescue_date.slice(0, 7)
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  const result: MonthlyRescueStat[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    d.setDate(1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    result.push({ month: key, label: `${d.getMonth() + 1}월`, rescued: map.get(key) ?? 0 })
  }

  return result
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
