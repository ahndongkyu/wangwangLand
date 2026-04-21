import { createClient } from "@/shared/lib/supabase/server"
import type { Notice } from "@/shared/types/database"

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
