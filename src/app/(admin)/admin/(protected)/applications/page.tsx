import { AdminApplicationList } from "@/features/applications/components/admin-application-list"
import { getAdminApplicationList } from "@/features/applications/api/admin-queries"
import { parseApplicationFilters, type AdminApplicationParams } from "@/features/applications/lib/admin-list"

export const dynamic = "force-dynamic"

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<AdminApplicationParams> }) {
  const filters = parseApplicationFilters(await searchParams)
  const result = await getAdminApplicationList(filters)
  return <AdminApplicationList filters={filters} {...result} />
}
