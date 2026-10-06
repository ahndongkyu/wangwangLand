"use server"

import { createClient } from "@/shared/lib/supabase/server"

export interface AdoptionAnimal {
  id: string
  kind: "dog" | "cat"
  name: string
  image: string | null
}

export async function searchAdoptionAnimals(search: string): Promise<{ animals: AdoptionAnimal[]; error?: string }> {
  const query = search.trim().slice(0, 60).replace(/[%_\\]/g, "")
  if (!query) return { animals: [] }
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { animals: [], error: "로그인 후 다시 검색해 주세요." }
  const results = await Promise.all((["dogs", "cats"] as const).map(async table => {
    const result = await client.from(table).select("id, name, images, thumbnail_index")
      .in("status", ["보호중", "임시보호중"]).ilike("name", `%${query}%`).order("name").limit(10)
    return { ...result, kind: table === "dogs" ? "dog" as const : "cat" as const }
  }))
  if (results.some(result => result.error)) return { animals: [], error: "검색하지 못했습니다. 잠시 후 다시 시도해 주세요." }
  return { animals: results.flatMap(result => (result.data ?? []).map(animal => ({
    id: animal.id, name: animal.name, kind: result.kind,
    image: animal.images?.[animal.thumbnail_index] ?? animal.images?.[0] ?? null,
  }))) }
}
