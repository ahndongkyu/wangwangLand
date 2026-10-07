import { getCurrentAdmin } from "@/features/auth"
import { listDogsWithCount } from "@/features/dogs/api/queries"
import { listCatsWithCount } from "@/features/cats/api/queries"
import { parseAnimalFilters, type AnimalKind, type AnimalSearchParams } from "../lib/admin-filters"
import { AdminAnimalList } from "./admin-animal-list"

export async function AdminAnimalPage({ kind, searchParams }: { kind: AnimalKind; searchParams: Promise<AnimalSearchParams> }) {
  const filters = parseAnimalFilters(kind, await searchParams)
  const options = { ...filters, query: filters.q, limit: filters.pageSize, offset: (filters.page - 1) * filters.pageSize, includeLocation: true }
  const [me, result] = await Promise.all([
    getCurrentAdmin(),
    kind === "dogs" ? listDogsWithCount(options) : listCatsWithCount({ ...options, sort: filters.sort === "pinned" ? "latest" : filters.sort }),
  ])
  const animals = "dogs" in result ? result.dogs : result.cats
  return <AdminAnimalList kind={kind} animals={animals} total={result.total} filters={filters} canDelete={!!me} />
}
