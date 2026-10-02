import { redirect } from "next/navigation"

export default async function ThanksPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const query = new URLSearchParams({ category: "후원" })
  if (params.q) query.set("q", params.q)
  if (params.page) query.set("page", params.page)
  redirect(`/daily?${query.toString()}`)
}
