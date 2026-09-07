import { redirect } from "next/navigation"

export default async function LegacyCalendarGridPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; cat?: string }>
}) {
  const params = await searchParams
  const nextParams = new URLSearchParams()
  if (params.ym) nextParams.set("ym", params.ym)
  if (params.cat) nextParams.set("cat", params.cat)

  const query = nextParams.toString()
  redirect(query ? `/calendar?${query}` : "/calendar")
}
