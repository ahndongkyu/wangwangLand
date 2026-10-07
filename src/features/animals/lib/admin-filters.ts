import type { DogGender, DogSize, DogStatus } from "@/shared/types/database"

export type AnimalKind = "dogs" | "cats"
export type AnimalSearchParams = Record<string, string | string[] | undefined>
export const ANIMAL_STATUSES: DogStatus[] = ["보호중", "임시보호중", "입양완료", "무지개다리"]
export const ANIMAL_SIZES: DogSize[] = ["소", "중소", "중", "중대", "대", "대대"]
export const ANIMAL_GENDERS: DogGender[] = ["수컷", "암컷", "미상"]

export function parseAnimalFilters(kind: AnimalKind, params: AnimalSearchParams) {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : ""
  const status: DogStatus | "전체" = ANIMAL_STATUSES.find(s => s === value("status")) ?? "전체"
  const size: DogSize | "전체" = kind === "dogs" ? ANIMAL_SIZES.find(s => s === value("size")) ?? "전체" : "전체"
  const gender: DogGender | "전체" = ANIMAL_GENDERS.find(s => s === value("gender")) ?? "전체"
  const neutered: "true" | "false" | "전체" = value("neutered") === "true" ? "true" : value("neutered") === "false" ? "false" : "전체"
  const sort: "name" | "pinned" | "latest" = value("sort") === "name" ? "name" : kind === "dogs" && value("sort") === "pinned" ? "pinned" : "latest"
  const pageSize = [20, 50, 100].includes(Number(value("pageSize"))) ? Number(value("pageSize")) : 20
  const rawPage = Number(value("page"))
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1
  return { status, size, gender, neutered, sort, pageSize, page, q: value("q").trim() }
}

export function animalFilterParams(filters: ReturnType<typeof parseAnimalFilters>) {
  return {
    q: filters.q || undefined,
    status: filters.status === "전체" ? undefined : filters.status,
    size: filters.size === "전체" ? undefined : filters.size,
    gender: filters.gender === "전체" ? undefined : filters.gender,
    neutered: filters.neutered === "전체" ? undefined : filters.neutered,
    sort: filters.sort === "latest" ? undefined : filters.sort,
    pageSize: filters.pageSize === 20 ? undefined : String(filters.pageSize),
  }
}

export function animalListHref(kind: AnimalKind, params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value)
  return `/admin/${kind}${query.size ? `?${query}` : ""}`
}
