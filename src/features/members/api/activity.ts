import "server-only"
import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { recordOperationError } from "@/features/operation-logs/server"
import { communityType, type CommunityType } from "@/features/daily/lib/community-category"

export interface MemberActivityPost {
  id: string
  source: "daily" | "story" | "thanks"
  title: string
  category: CommunityType
  date: string
  draft: boolean
  href: string
}
export interface MemberActivity {
  posts: MemberActivityPost[]
  total: number
  filteredTotal: number
  page: number
  totalPages: number
}
const SOURCES = [
  { table: "daily_posts", source: "daily", date: "posted_at", fields: "id,title,category,posted_at", path: "daily" },
  { table: "adoption_stories", source: "story", date: "created_at", fields: "id,title,created_at,published_at", path: "stories" },
  { table: "donation_thanks", source: "thanks", date: "created_at", fields: "id,title,created_at,published_at", path: "thanks" },
] as const
const PAGE_SIZE = 10

/** 작성자 ID로만 연결한다. 원본 글·댓글·좋아요는 이동하거나 복사하지 않는다. */
export async function listMemberActivity(memberId: string, options: { category?: CommunityType; page?: number } = {}): Promise<MemberActivity> {
  const auth = await requireAdmin()
  if (!auth.ok) throw new Error(auth.error)
  const client = await createClient()
  const category = options.category
  const requested = Number.isSafeInteger(options.page) && options.page! > 0 ? options.page! : 1
  const countQuery = (table: string) => client.from(table).select("id", { count: "exact", head: true }).eq("created_by", memberId)
  // 과거 분류도 홈페이지 이야기와 같은 기준으로 묶는다.
  const dailyFilter = <T extends { in: (column: string, values: string[]) => T; or: (filter: string) => T }>(query: T): T => {
    if (category === "일상") return query.or('category.is.null,category.not.in.("자유","자유게시판","질문 및 답변","후기","봉사 후기","입양 후기","후원","후원 소식")')
    if (category === "자유") return query.in("category", ["자유", "자유게시판", "질문 및 답변"])
    if (category === "후기") return query.in("category", ["후기", "봉사 후기", "입양 후기"])
    if (category === "후원") return query.in("category", ["후원", "후원 소식"])
    return query
  }
  try {
    const counts = await Promise.all(SOURCES.map(source => countQuery(source.table)))
    const failedCount = counts.find(result => result.error || result.count == null)
    if (failedCount) throw new Error("게시글 수 조회 실패", { cause: failedCount.error })
    const total = counts.reduce((sum, result) => sum + result.count!, 0)
    const filteredDaily = category ? await dailyFilter(countQuery("daily_posts")) : counts[0]
    if (filteredDaily.error || filteredDaily.count == null) throw new Error("유형별 게시글 수 조회 실패", { cause: filteredDaily.error })
    const sourceCounts = [filteredDaily.count, !category || category === "후기" ? counts[1].count! : 0, !category || category === "후원" ? counts[2].count! : 0]
    const filteredTotal = sourceCounts.reduce((sum, count) => sum + count, 0)
    const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE))
    const page = Math.min(requested, totalPages)
    const needed = page * PAGE_SIZE
    const groups = await Promise.all(SOURCES.map(async (source, index) => {
      const posts: MemberActivityPost[] = []
      const target = Math.min(needed, sourceCounts[index])
      for (let cursor = 0; cursor < target;) {
        let query = client.from(source.table).select(source.fields).eq("created_by", memberId)
          .order(source.date, { ascending: false }).order("id", { ascending: true })
          .range(cursor, Math.min(cursor + 199, target - 1))
        if (source.source === "daily") query = dailyFilter(query)
        const { data, error } = await query
        if (error) throw new Error("작성 게시글 조회 실패", { cause: error })
        if (!data?.length) break
        for (const item of data) {
          const row = item as unknown as { id: string; title: string; category?: string | null; posted_at?: string; created_at?: string; published_at?: string | null }
          posts.push({ id: row.id, source: source.source, title: row.title,
            category: source.source === "daily" ? communityType(row.category) : source.source === "story" ? "후기" : "후원",
            date: (source.source === "daily" ? row.posted_at : row.created_at)!,
            draft: source.source !== "daily" && !row.published_at,
            href: `/admin/${source.path}/${row.id}/edit`,
          })
        }
        cursor += data.length
      }
      return posts
    }))
    const posts = groups.flat().sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id) || a.source.localeCompare(b.source))
      .slice((page - 1) * PAGE_SIZE, needed)
    return { posts, total, filteredTotal, page, totalPages }
  } catch (error) {
    await recordOperationError("query", "listMemberActivity", error, "admin", { targetId: memberId, action: "read" })
    throw new Error("작성한 이야기를 불러오지 못했습니다. 다시 시도해 주세요.", { cause: error })
  }
}
