import Link from "next/link"

import { listDogs } from "@/features/dogs"
import { StoryForm } from "@/features/stories"

export const dynamic = "force-dynamic"

export default async function AdminStoriesNewPage() {
  const dogs = await listDogs({ sort: "name", limit: 500 })
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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          새 입양 후기 작성
        </h1>
      </header>
      <StoryForm dogs={dogOptions} cancelHref="/admin/stories" returnTo="/admin/stories" />
    </div>
  )
}
