import { createClient } from "@/shared/lib/supabase/server"
import type { DailyPost } from "@/shared/types/database"

export interface ListDailyOptions {
  query?: string
  limit?: number
  offset?: number
}

export interface PaginatedDaily {
  posts: DailyPost[]
  total: number
}

export async function listDailyPosts({
  query: searchQuery,
  limit = 12,
  offset = 0,
}: ListDailyOptions = {}): Promise<PaginatedDaily> {
  const supabase = await createClient()

  let query = supabase
    .from("daily_posts")
    .select("*", { count: "exact" })
    .order("posted_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1)

  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("title", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listDailyPosts] error:", error)
    return { posts: [], total: 0 }
  }

  return { posts: (data ?? []) as DailyPost[], total: count ?? 0 }
}

export async function getDailyPost(id: string): Promise<DailyPost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("daily_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getDailyPost] error:", error)
    return null
  }

  return data as DailyPost | null
}
