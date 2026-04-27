import Link from "next/link"
import { notFound } from "next/navigation"

import { listDogs } from "@/features/dogs"
import { StoryForm, StoryDeleteButton, getAdoptionStory } from "@/features/stories"

export const dynamic = "force-dynamic"

export default async function AdminStoriesEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [story, dogs] = await Promise.all([
    getAdoptionStory(id, { includeDrafts: true }),
    listDogs({ sort: "name", limit: 500 }),
  ])

  if (!story) notFound()

  const dogOptions = dogs.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
  }))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/stories" className="hover:text-foreground">
          ← 입양 후기 목록
        </Link>
      </nav>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          입양 후기 수정
        </h1>
        <StoryDeleteButton id={id} title={story.title} redirectTo="/admin/stories" />
      </header>
      <StoryForm story={story} dogs={dogOptions} cancelHref="/admin/stories" returnTo="/admin/stories" />
    </div>
  )
}
