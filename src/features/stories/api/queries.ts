import { createClient } from "@/shared/lib/supabase/server"
import type { AdoptionStory } from "@/shared/types/database"

export interface StoryDogRef {
  id: string
  name: string
  images: string[]
  thumbnail_index: number
}

export type StoryWithDog = AdoptionStory & {
  dog: StoryDogRef | null
}

export interface ListStoriesOptions {
  query?: string
  limit?: number
  offset?: number
  /** true면 임시저장까지 전부 반환 (어드민 전용). public 페이지에서는 false 유지. */
  includeDrafts?: boolean
}

export interface PaginatedStories {
  stories: StoryWithDog[]
  total: number
}

export async function listAdoptionStories({
  query: searchQuery,
  limit = 12,
  offset = 0,
  includeDrafts = false,
}: ListStoriesOptions = {}): Promise<PaginatedStories> {
  const supabase = await createClient()

  let query = supabase
    .from("adoption_stories")
    .select("*, dog:dogs(id, name, images, thumbnail_index)", {
      count: "exact",
    })

  if (includeDrafts) {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
  } else {
    query = query
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .order("id", { ascending: true })
  }

  query = query.range(offset, offset + limit - 1)

  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("title", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listAdoptionStories] error:", error)
    return { stories: [], total: 0 }
  }

  return { stories: (data ?? []) as StoryWithDog[], total: count ?? 0 }
}

export async function getAdoptionStory(
  id: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): Promise<StoryWithDog | null> {
  const supabase = await createClient()

  let query = supabase
    .from("adoption_stories")
    .select("*, dog:dogs(id, name, images, thumbnail_index)")
    .eq("id", id)

  if (!includeDrafts) {
    query = query.not("published_at", "is", null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error("[getAdoptionStory] error:", error)
    return null
  }

  return data as StoryWithDog | null
}
