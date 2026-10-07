import { AdminAnimalPage } from "@/features/animals/components/admin-animal-page"
import type { AnimalSearchParams } from "@/features/animals/lib/admin-filters"

export const dynamic = "force-dynamic"

export default function AdminCatsPage({ searchParams }: { searchParams: Promise<AnimalSearchParams> }) {
  return <AdminAnimalPage kind="cats" searchParams={searchParams} />
}
