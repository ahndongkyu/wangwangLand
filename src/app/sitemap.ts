import type { MetadataRoute } from "next"

import { createClient } from "@/shared/lib/supabase/server"
import { SITE } from "@/shared/constants/site"

// 매 24시간마다 재생성. 필요시 revalidatePath('/sitemap.xml') 로 수동 갱신 가능.
export const revalidate = 86400

const STATIC_ROUTES: Array<{
  path: string
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority?: number
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/dogs", changeFrequency: "daily", priority: 0.9 },
  { path: "/cats", changeFrequency: "daily", priority: 0.8 },
  { path: "/stories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/daily", changeFrequency: "daily", priority: 0.7 },
  { path: "/notice", changeFrequency: "weekly", priority: 0.7 },
  { path: "/calendar", changeFrequency: "weekly", priority: 0.7 },
  { path: "/adopt", changeFrequency: "monthly", priority: 0.8 },
  { path: "/volunteer", changeFrequency: "monthly", priority: 0.7 },
  { path: "/donate", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  // 동적 엔트리는 실패해도 정적 entry 는 반드시 반환되도록 감싼다.
  const dynamicEntries: MetadataRoute.Sitemap = []
  try {
    const supabase = await createClient()

    const [dogsRes, catsRes, dailyRes, storiesRes, noticesRes] =
      await Promise.all([
        supabase
          .from("dogs")
          .select("id, updated_at")
          .order("updated_at", { ascending: false }),
        supabase
          .from("cats")
          .select("id, updated_at")
          .order("updated_at", { ascending: false }),
        supabase
          .from("daily_posts")
          .select("id, posted_at")
          .order("posted_at", { ascending: false }),
        supabase
          .from("adoption_stories")
          .select("id, updated_at")
          .not("published_at", "is", null)
          .order("updated_at", { ascending: false }),
        supabase
          .from("notices")
          .select("id, updated_at")
          .not("published_at", "is", null)
          .order("updated_at", { ascending: false }),
      ])

    for (const d of dogsRes.data ?? []) {
      dynamicEntries.push({
        url: `${SITE.url}/dogs/${d.id}`,
        lastModified: new Date(d.updated_at),
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
    for (const c of catsRes.data ?? []) {
      dynamicEntries.push({
        url: `${SITE.url}/cats/${c.id}`,
        lastModified: new Date(c.updated_at),
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
    for (const p of dailyRes.data ?? []) {
      dynamicEntries.push({
        url: `${SITE.url}/daily/${p.id}`,
        lastModified: new Date(p.posted_at),
        changeFrequency: "monthly",
        priority: 0.5,
      })
    }
    for (const s of storiesRes.data ?? []) {
      dynamicEntries.push({
        url: `${SITE.url}/stories/${s.id}`,
        lastModified: new Date(s.updated_at),
        changeFrequency: "monthly",
        priority: 0.7,
      })
    }
    for (const n of noticesRes.data ?? []) {
      dynamicEntries.push({
        url: `${SITE.url}/notice/${n.id}`,
        lastModified: new Date(n.updated_at),
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
  } catch (err) {
    console.error("[sitemap] dynamic entries failed:", err)
  }

  return [...staticEntries, ...dynamicEntries]
}
