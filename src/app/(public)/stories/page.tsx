import { redirect } from "next/navigation"

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page } = await searchParams
  const params = new URLSearchParams({ category: "후기" })
  if (q) params.set("q", q)
  if (page) params.set("page", page)
  redirect(`/daily?${params.toString()}`)
}
