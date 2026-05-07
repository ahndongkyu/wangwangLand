import { createClient } from "@/shared/lib/supabase/server"
import { fetchAuthorMap, type AuthorInfo } from "@/shared/lib/fetch-authors"
import type { Notice } from "@/shared/types/database"

import type { RecentNoticeMeta } from "../types"

export type { RecentNoticeMeta }

export type NoticeWithAuthor = Notice & { author: AuthorInfo | null }

export interface ListNoticesOptions {
  /** true면 미발행 포함 (어드민용) */
  includeDrafts?: boolean
  query?: string
  limit?: number
  offset?: number
  /** "published" | "draft" | undefined (undefined = all) */
  status?: "published" | "draft"
  /** 카테고리 prefix (예: "공지", "이벤트") */
  category?: string
}

export interface PaginatedNotices {
  notices: NoticeWithAuthor[]
  total: number
  publishedCount: number
  draftCount: number
}

export async function listNotices({
  includeDrafts = false,
  query: searchQuery,
  limit = 20,
  offset = 0,
  status,
  category,
}: ListNoticesOptions = {}): Promise<PaginatedNotices> {
  const supabase = await createClient()

  let query = supabase
    .from("notices")
    .select("id, title, is_pinned, published_at, created_at, created_by, view_count", { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1)

  if (!includeDrafts || status === "published") {
    query = query.not("published_at", "is", null)
  } else if (status === "draft") {
    query = query.is("published_at", null)
  }

  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("title", `%${searchQuery.trim()}%`)
  }
  if (category && category.trim()) {
    query = query.ilike("title", `[${category.trim()}]%`)
  }

  if (includeDrafts) {
    const [mainResult, publishedCountRes, draftCountRes] = await Promise.all([
      query,
      supabase.from("notices").select("*", { count: "exact", head: true }).not("published_at", "is", null),
      supabase.from("notices").select("*", { count: "exact", head: true }).is("published_at", null),
    ])

    if (mainResult.error) {
      console.error("[listNotices] error:", mainResult.error)
      return { notices: [], total: 0, publishedCount: 0, draftCount: 0 }
    }

    const authorMap = await fetchAuthorMap((mainResult.data ?? []).map((n) => n.created_by))
    const notices: NoticeWithAuthor[] = (mainResult.data ?? []).map((n) => ({
      ...(n as unknown as Notice),
      author: n.created_by ? (authorMap[n.created_by] ?? null) : null,
    }))

    return {
      notices,
      total: mainResult.count ?? 0,
      publishedCount: publishedCountRes.count ?? 0,
      draftCount: draftCountRes.count ?? 0,
    }
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listNotices] error:", error)
    return { notices: [], total: 0, publishedCount: 0, draftCount: 0 }
  }

  const authorMap = await fetchAuthorMap((data ?? []).map((n) => n.created_by))

  const notices: NoticeWithAuthor[] = (data ?? []).map((n) => ({
    ...(n as unknown as Notice),
    author: n.created_by ? (authorMap[n.created_by] ?? null) : null,
  }))

  return { notices, total: count ?? 0, publishedCount: count ?? 0, draftCount: 0 }
}

/**
 * 헤더 뱃지 계산용 — 최근 발행된 공지의 타임스탬프·핀 여부만 반환.
 */
export async function listRecentPublishedNotices(
  limit = 20
): Promise<RecentNoticeMeta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notices")
    .select("id, published_at, is_pinned")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[listRecentPublishedNotices] error:", error)
    return []
  }

  return (data ?? []) as RecentNoticeMeta[]
}

export interface AdjacentNotice {
  id: string
  title: string
}

export async function getAdjacentNotices(
  currentId: string,
  publishedAt: string
): Promise<{ prev: AdjacentNotice | null; next: AdjacentNotice | null }> {
  const supabase = await createClient()
  const [olderRes, newerRes] = await Promise.all([
    supabase
      .from("notices")
      .select("id, title")
      .not("published_at", "is", null)
      .neq("id", currentId)
      .lt("published_at", publishedAt)
      .order("published_at", { ascending: false })
      .limit(1),
    supabase
      .from("notices")
      .select("id, title")
      .not("published_at", "is", null)
      .neq("id", currentId)
      .gt("published_at", publishedAt)
      .order("published_at", { ascending: true })
      .limit(1),
  ])
  return {
    prev: (olderRes.data?.[0] as AdjacentNotice | undefined) ?? null,
    next: (newerRes.data?.[0] as AdjacentNotice | undefined) ?? null,
  }
}

export async function getNotice(
  id: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): Promise<NoticeWithAuthor | null> {
  const supabase = await createClient()

  let query = supabase.from("notices").select("*").eq("id", id)
  if (!includeDrafts) {
    query = query.not("published_at", "is", null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error("[getNotice] error:", error)
    return null
  }
  if (!data) return null

  const authorMap = await fetchAuthorMap([data.created_by])
  return {
    ...(data as Notice),
    author: data.created_by ? (authorMap[data.created_by] ?? null) : null,
  }
}
