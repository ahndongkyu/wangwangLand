import { createClient } from "@/shared/lib/supabase/server"
import type { Dog, DogGender, DogSize, DogStatus } from "@/shared/types/database"

export type DogSort = "latest" | "name" | "pinned"

/** 카드 목록에 필요한 컬럼만 선택 (description 등 큰 텍스트 제외) */
const DOG_CARD_COLS =
  "id, name, images, thumbnail_index, status, breed, gender, birth_date, age_months, size, neutered, rescue_date, updated_at, is_pinned, pin_order" as const

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

  let query = supabase.from("dogs").select(DOG_CARD_COLS)

  if (sort === "name") {
    query = query.order("name", { ascending: true }).order("id", { ascending: true })
  } else if (sort === "pinned") {
    query = query
      .order("is_pinned", { ascending: false })
      .order("pin_order", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false })
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

  let query = supabase.from("dogs").select(DOG_CARD_COLS, { count: "exact" })

  if (sort === "name") {
    query = query.order("name", { ascending: true }).order("id", { ascending: true })
  } else if (sort === "pinned") {
    query = query
      .order("is_pinned", { ascending: false })
      .order("pin_order", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false })
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

  // 같은 크기 우선 쿼리 (있을 때만), 나머지 채우기 쿼리를 병렬 실행
  const [sameSize, any] = await Promise.all([
    current.size
      ? supabase
          .from("dogs")
          .select(DOG_CARD_COLS)
          .in("status", ["보호중", "임시보호중"])
          .neq("id", current.id)
          .eq("size", current.size)
          .order("updated_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [] as Dog[], error: null }),
    supabase
      .from("dogs")
      .select(DOG_CARD_COLS)
      .in("status", ["보호중", "임시보호중"])
      .neq("id", current.id)
      .order("updated_at", { ascending: false })
      .limit(limit),
  ])

  if (any.error) {
    console.error("[listSimilarDogs]", any.error)
    return []
  }

  // 같은 크기 먼저, 중복 제거, limit 개 반환
  const seen = new Set<string>()
  const result: Dog[] = []
  for (const d of [...(sameSize.data ?? []), ...(any.data ?? [])]) {
    if (result.length >= limit) break
    if (!seen.has(d.id)) {
      seen.add(d.id)
      result.push(d as Dog)
    }
  }
  return result
}

/**
 * 홈 "새 가족을 기다려요" 섹션용 쿼리.
 * 1순위: is_pinned = true (pin_order ASC)
 * 2순위: 나머지 슬롯 → 보호 중 최신 입소순 자동 채움
 * 총 limit 개 (기본 8) 반환.
 */
export async function listDogsForHome(limit = 8): Promise<Dog[]> {
  const supabase = await createClient()

  // 사진 등록된 아이만 노출하기 위해 여유 있게 가져온 후 필터.
  // (images 가 빈 배열인 row 도 같이 오므로 클라이언트에서 거른다)
  const fetchLimit = Math.max(limit * 3, 24)
  const hasImages = (d: Dog) => (d.images ?? []).length > 0

  // 고정 먼저
  const { data: pinned } = await supabase
    .from("dogs")
    .select(DOG_CARD_COLS)
    .eq("is_pinned", true)
    .in("status", ["보호중", "임시보호중"])
    .order("pin_order", { ascending: true, nullsFirst: false })
    .limit(fetchLimit)

  const pinnedDogs = ((pinned ?? []) as Dog[]).filter(hasImages)

  if (pinnedDogs.length >= limit) return pinnedDogs.slice(0, limit)

  const remaining = limit - pinnedDogs.length
  const pinnedIds = pinnedDogs.map((d) => d.id)

  let fillQuery = supabase
    .from("dogs")
    .select(DOG_CARD_COLS)
    .eq("is_pinned", false)
    .in("status", ["보호중", "임시보호중"])
    .order("rescue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(fetchLimit)

  if (pinnedIds.length > 0) {
    fillQuery = fillQuery.not("id", "in", `(${pinnedIds.join(",")})`)
  }

  const { data: filler } = await fillQuery
  const fillerWithImages = ((filler ?? []) as Dog[])
    .filter(hasImages)
    .slice(0, remaining)

  return [...pinnedDogs, ...fillerWithImages]
}

/** 현재 고정된 강아지 수 (최대 8개 제한용) */
export async function countPinnedDogs(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("dogs")
    .select("id", { count: "exact", head: true })
    .eq("is_pinned", true)
  return count ?? 0
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
