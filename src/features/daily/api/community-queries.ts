import { listDailyPosts } from "./queries"
import { listAdoptionStories } from "@/features/stories/api/queries"
import { listDonationThanks } from "@/features/thanks/api/queries"
import { fetchAuthorMap } from "@/shared/lib/fetch-authors"
import type { AuthorInfo } from "@/shared/lib/fetch-authors"
import { communityType, type CommunityType } from "../lib/community-category"

export interface CommunityPost {
  id: string
  source: "daily" | "story" | "thanks"
  title: string
  content: string | null
  images: string[]
  date: string
  author: AuthorInfo | null
  viewCount: number
  category: CommunityType
  href: string
  draft?: boolean
}

// 각 원본의 ID와 주소를 유지해 댓글·좋아요·후원 연결을 보존한다.
export async function listCommunityPosts({ query, category, limit = 20, offset = 0, includeDrafts = false }: {
  query?: string
  category?: CommunityType
  limit?: number
  offset?: number
  includeDrafts?: boolean
} = {}) {
  const take = Math.max(1, Math.trunc(limit))
  const start = Math.max(0, Math.trunc(offset))
  const needed = start + take

  async function dailyRows() {
    const posts: CommunityPost[] = []
    let total = 0
    // Supabase 행 반환 제한보다 작은 청크로 조회한다.
    for (let cursor = 0; cursor < needed;) {
      const result = await listDailyPosts({ query, community: category, limit: Math.min(200, needed - cursor), offset: cursor })
      total = result.total
      posts.push(...result.posts.map((post): CommunityPost => ({ id: post.id, source: "daily", title: post.title, content: post.content, images: post.images, date: post.posted_at, author: post.author, viewCount: post.view_count, category: communityType(post.category), href: `/daily/${post.id}` })))
      cursor += result.posts.length
      if (result.posts.length === 0 || cursor >= total) break
    }
    return { posts, total }
  }

  async function storyRows() {
    const posts: CommunityPost[] = []
    if (category && category !== "후기") return { posts, total: 0 }
    let total = 0
    for (let cursor = 0; cursor < needed;) {
      const result = await listAdoptionStories({ query, includeDrafts, limit: Math.min(200, needed - cursor), offset: cursor })
      total = result.total
      posts.push(...result.stories.map((post): CommunityPost => ({ id: post.id, source: "story", title: post.title, content: post.content, images: post.images.length ? post.images : post.dog?.images ?? [], date: includeDrafts ? post.created_at : post.published_at!, author: post.author, viewCount: post.view_count, category: "후기", href: `/stories/${post.id}`, draft: !post.published_at })))
      cursor += result.stories.length
      if (result.stories.length === 0 || cursor >= total) break
    }
    return { posts, total }
  }

  async function thanksRows() {
    const posts: CommunityPost[] = []
    if (category && category !== "후원") return { posts, total: 0 }
    let total = 0
    for (let cursor = 0; cursor < needed;) {
      const result = await listDonationThanks({ query, includeDrafts, limit: Math.min(200, needed - cursor), offset: cursor })
      total = result.total
      const authors = await fetchAuthorMap(result.rows.map(post => post.created_by))
      posts.push(...result.rows.map((post): CommunityPost => ({
        id: post.id, source: "thanks", title: post.title, content: post.content,
        images: post.images.length ? [post.images[post.thumbnail_index] ?? post.images[0], ...post.images.filter((_, index) => index !== post.thumbnail_index)] : [],
        date: includeDrafts ? post.created_at : post.published_at!,
        author: post.created_by ? authors[post.created_by] ?? null : null,
        viewCount: post.view_count, category: "후원", href: `/thanks/${post.id}`, draft: !post.published_at,
      })))
      cursor += result.rows.length
      if (result.rows.length === 0 || cursor >= total) break
    }
    return { posts, total }
  }

  const [daily, stories, thanks] = await Promise.all([dailyRows(), storyRows(), thanksRows()])
  const posts = [...daily.posts, ...stories.posts, ...thanks.posts].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime() || a.id.localeCompare(b.id) || a.source.localeCompare(b.source)
  ).slice(start, needed)
  return { posts, total: daily.total + stories.total + thanks.total }
}
