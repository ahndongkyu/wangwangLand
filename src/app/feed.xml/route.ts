import { listNotices } from "@/features/notices"
import { listDailyPosts } from "@/features/daily"
import { listAdoptionStories } from "@/features/stories"
import { SITE } from "@/shared/constants/site"

export const dynamic = "force-dynamic"
export const revalidate = 1800 // 30분 캐시

interface FeedItem {
  title: string
  link: string
  pubDate: Date
  description: string
  category: string
  guid: string
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function stripTags(html: string | null | undefined, max = 200): string {
  if (!html) return ""
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return plain.length > max ? plain.slice(0, max) + "…" : plain
}

function formatRfc822(d: Date): string {
  return d.toUTCString()
}

export async function GET() {
  // 각 카테고리에서 최신 20건씩 가져와 합친 후 50건까지 노출.
  const [{ notices }, { posts: daily }, { stories }] = await Promise.all([
    listNotices({ limit: 20, offset: 0 }),
    listDailyPosts({ limit: 20, offset: 0 }),
    listAdoptionStories({ limit: 20, offset: 0 }),
  ])

  const items: FeedItem[] = []

  for (const n of notices) {
    if (!n.published_at) continue
    items.push({
      title: n.title,
      link: `${SITE.url}/notice/${n.id}`,
      pubDate: new Date(n.published_at),
      description: stripTags("공지사항"),
      category: "공지사항",
      guid: `notice-${n.id}`,
    })
  }

  for (const p of daily) {
    if (!p.posted_at) continue
    items.push({
      title: p.title,
      link: `${SITE.url}/daily/${p.id}`,
      pubDate: new Date(p.posted_at),
      description: stripTags(p.content),
      category: "일상",
      guid: `daily-${p.id}`,
    })
  }

  for (const s of stories) {
    if (!s.published_at) continue
    items.push({
      title: s.title,
      link: `${SITE.url}/stories/${s.id}`,
      pubDate: new Date(s.published_at),
      description: stripTags(s.content),
      category: "입양 후기",
      guid: `story-${s.id}`,
    })
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
  const top = items.slice(0, 50)

  const lastBuild = top[0]?.pubDate ?? new Date()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${formatRfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
${top
  .map(
    (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${i.link}</link>
      <guid isPermaLink="false">${i.guid}</guid>
      <pubDate>${formatRfc822(i.pubDate)}</pubDate>
      <category>${escapeXml(i.category)}</category>
      <description>${escapeXml(i.description)}</description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
    },
  })
}
