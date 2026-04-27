import { redirect, notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"

import { StoryForm, getAdoptionStory } from "@/features/stories"
import { listDogs } from "@/features/dogs"
import { getCurrentProfile } from "@/features/members"

export const metadata: Metadata = { title: "입양 후기 수정" }
export const dynamic = "force-dynamic"

export default async function StoriesEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [story, profile, dogs] = await Promise.all([
    getAdoptionStory(id, { includeDrafts: true }),
    getCurrentProfile(),
    listDogs({ sort: "name", limit: 500 }),
  ])

  if (!story) notFound()
  if (!profile) redirect("/login")
  if (profile.status !== "approved" || profile.is_banned) redirect("/")

  const isAuthor = story.created_by === profile.id
  const isStaff = profile.role === "staff" || profile.role === "admin"
  if (!isAuthor && !isStaff) redirect(`/stories/${id}`)

  const dogOptions = dogs.map((d) => ({ id: d.id, name: d.name, status: d.status }))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/stories/${id}`} className="hover:text-foreground">
          ← 글로 돌아가기
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">입양 후기 수정</h1>
      </header>
      <StoryForm story={story} dogs={dogOptions} cancelHref={`/stories/${id}`} returnTo={`/stories/${id}`} />
    </div>
  )
}
