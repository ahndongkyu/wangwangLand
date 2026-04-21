import { createClient } from "@/shared/lib/supabase/server"
import type { Notice } from "@/shared/types/database"

import type { RecentNoticeMeta } from "../types"

export type { RecentNoticeMeta }

export interface ListNoticesOptions {
  /** true면 미발행 포함 (어드민용) */
  includeDrafts?: boolean
  query?: string
  limit?: number
  offset?: number
}

export interface PaginatedNotices {
  notices: Notice[]
  total: number
}

export async function listNotices({
  includeDrafts = false,
  query: searchQuery,
  limit = 20,
  offset = 0,
}: ListNoticesOptions = {}): Promise<PaginatedNotices> {
  const supabase = await createClient()

  let query = supabase
    .from("notices")
    .select("*", { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1)

  if (!includeDrafts) {
    query = query.not("published_at", "is", null)
  }
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("title", `%${searchQuery.trim()}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error("[listNotices] error:", error)
    return { notices: [], total: 0 }
  }

  return { notices: (data ?? []) as Notice[], total: count ?? 0 }
}

/**
 * 헤더 뱃지 계산용 — 최근 발행된 공지의 타임스탬프·핀 여부만 반환.
 * 클라이언트가 localStorage 의 lastSeenAt 과 비교해 "N" 뱃지를 띄우는 데 사용.
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

export async function getNotice(
  id: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): Promise<Notice | null> {
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

  return data as Notice | null
}
