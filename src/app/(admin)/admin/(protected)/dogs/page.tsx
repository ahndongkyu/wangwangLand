import { AdminAnimalPage } from "@/features/animals/components/admin-animal-page"
import type { AnimalSearchParams } from "@/features/animals/lib/admin-filters"

export const dynamic = "force-dynamic"

export default function AdminDogsPage({ searchParams }: { searchParams: Promise<AnimalSearchParams> }) {
  return <AdminAnimalPage kind="dogs" searchParams={searchParams} />
}
