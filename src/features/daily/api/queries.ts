import { createClient } from "@/shared/lib/supabase/server"
import { fetchAuthorMap, type AuthorInfo } from "@/shared/lib/fetch-authors"
import type { DailyPost } from "@/shared/types/database"

export type DailyPostWithAuthor = DailyPost & { author: AuthorInfo | null }

export interface ListDailyOptions {
  query?: string
  limit?: number
  offset?: number
}

export interface PaginatedDaily {
  posts: DailyPostWithAuthor[]
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
    .select("id, title, images, content, posted_at, created_by, view_count, category", { count: "exact" })
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

  const authorMap = await fetchAuthorMap((data ?? []).map((p) => p.created_by))

  const posts: DailyPostWithAuthor[] = (data ?? []).map((p) => ({
    ...(p as unknown as DailyPost),
    author: p.created_by ? (authorMap[p.created_by] ?? null) : null,
  }))

  return { posts, total: count ?? 0 }
}

/** 어드민 회원 상세에서 사용: 특정 user 의 일상 글 목록 (최근순) */
export async function listDailyPostsByUser(
  userId: string,
  limit = 5
): Promise<DailyPostWithAuthor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("daily_posts")
    .select("id, title, images, content, posted_at, created_by, view_count")
    .eq("created_by", userId)
    .order("posted_at", { ascending: false })
    .limit(limit)
  if (error) {
    console.error("[listDailyPostsByUser]", error)
    return []
  }
  return (data ?? []).map((p) => ({
    ...(p as unknown as DailyPost),
    author: null,
  }))
}

export async function countDailyPostsByUser(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("daily_posts")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
  return count ?? 0
}

export interface AdjacentDailyPost {
  id: string
  title: string
}

export async function getAdjacentDailyPosts(
  currentId: string,
  postedAt: string
): Promise<{ prev: AdjacentDailyPost | null; next: AdjacentDailyPost | null }> {
  const supabase = await createClient()
  const [olderRes, newerRes] = await Promise.all([
    supabase
      .from("daily_posts")
      .select("id, title")
      .neq("id", currentId)
      .lt("posted_at", postedAt)
      .order("posted_at", { ascending: false })
      .limit(1),
    supabase
      .from("daily_posts")
      .select("id, title")
      .neq("id", currentId)
      .gt("posted_at", postedAt)
      .order("posted_at", { ascending: true })
      .limit(1),
  ])
  return {
    prev: (olderRes.data?.[0] as AdjacentDailyPost | undefined) ?? null,
    next: (newerRes.data?.[0] as AdjacentDailyPost | undefined) ?? null,
  }
}

export async function getDailyPost(id: string): Promise<DailyPostWithAuthor | null> {
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
  if (!data) return null

  const authorMap = await fetchAuthorMap([data.created_by])
  return {
    ...(data as DailyPost),
    author: data.created_by ? (authorMap[data.created_by] ?? null) : null,
  }
}
