import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"

import { StoryForm } from "@/features/stories"
import { listDogs } from "@/features/dogs"
import { getCurrentProfile } from "@/features/members"

export const metadata: Metadata = { title: "입양 후기 작성" }
export const dynamic = "force-dynamic"

export default async function StoriesNewPage() {
  const [profile, dogs] = await Promise.all([
    getCurrentProfile(),
    listDogs({ sort: "name", limit: 500 }),
  ])

  if (!profile) redirect("/login")
  if (profile.status !== "approved" || profile.is_banned) redirect("/")

  const dogOptions = dogs.map((d) => ({ id: d.id, name: d.name, status: d.status }))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/stories" className="hover:text-foreground">
          ← 입양 후기 목록
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">입양 후기 작성</h1>
      </header>
      <StoryForm dogs={dogOptions} cancelHref="/stories" returnTo="/stories" />
    </div>
  )
}
