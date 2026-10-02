import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, Date, require: (name) => {
    assert.ok(name in imports, `Unexpected import: ${name}`)
    return imports[name]
  } })
  return exports
}

const categories = load("src/features/daily/lib/community-category.ts")
test("legacy types retain their intended community groups", () => {
  for (const value of [null, "입소", "구조 소식", "시설 안내"]) assert.equal(categories.communityType(value), "일상")
  for (const value of ["자유", "자유게시판", "질문 및 답변"]) assert.equal(categories.communityType(value), "자유")
  for (const value of ["후기", "봉사 후기", "입양 후기"]) assert.equal(categories.communityType(value), "후기")
  for (const value of ["후원", "후원 소식"]) assert.equal(categories.communityType(value), "후원")
  assert.equal(categories.communityFilter("전체"), undefined)
})

const { recentMonthWindows } = load("src/shared/lib/month-windows.ts")
test("KST month boundary and leap year remain independent of local timezone", () => {
  const windows = recentMonthWindows(2, new Date("2024-02-29T15:00:00Z"))
  assert.equal(windows[0].month, "2024-02")
  assert.equal(windows[0].lastDay, "2024-02-29")
  assert.equal(windows[1].month, "2024-03")
  assert.equal(windows[1].from, "2024-02-29T15:00:00.000Z")
  assert.equal(windows[0].to, windows[1].from)
  assert.equal(recentMonthWindows(2, new Date("2026-01-31T12:00:00Z"))[0].month, "2025-12")
})

function fixture() {
  const calls = []
  const daily = Array.from({ length: 230 }, (_, index) => ({ id: `daily-${index}`, title: "일상", content: "", images: [], posted_at: new Date(Date.UTC(2026, 0, 1) - index * 2000).toISOString(), category: "일상", author: null, view_count: 0 }))
  const stories = Array.from({ length: 230 }, (_, index) => ({ id: `story-${index}`, title: "후기", content: "", images: [], published_at: new Date(Date.UTC(2026, 0, 1) - index * 2000 - 1000).toISOString(), created_at: "2026-01-01T00:00:00Z", author: null, view_count: 0 }))
  const api = load("src/features/daily/api/community-queries.ts", {
    "./queries": { listDailyPosts: async ({ offset, limit }) => ({ posts: daily.slice(offset, offset + limit), total: daily.length }) },
    "@/features/stories/api/queries": { listAdoptionStories: async (options) => { calls.push(options); return { stories: stories.slice(options.offset, options.offset + options.limit), total: stories.length } } },
    "@/features/thanks/api/queries": { listDonationThanks: async () => ({ rows: [], total: 0 }) },
    "@/shared/lib/fetch-authors": { fetchAuthorMap: async () => ({}) },
    "../lib/community-category": categories,
  })
  return { api, calls }
}

test("mixed-source pagination preserves original IDs and URLs across chunks", async () => {
  const { api, calls } = fixture()
  const result = await api.listCommunityPosts({ offset: 410, limit: 20 })
  assert.equal(result.total, 460)
  assert.equal(result.posts.length, 20)
  assert.equal(result.posts[0].href, "/daily/daily-205")
  assert.equal(result.posts[1].href, "/stories/story-205")
  assert.equal(new Set(result.posts.map((post) => post.href)).size, 20)
  assert.ok(calls.every((call) => call.limit <= 200 && call.includeDrafts === false))
})

test("non-review filter skips the adoption source", async () => {
  const { api, calls } = fixture()
  await api.listCommunityPosts({ category: "일상" })
  assert.equal(calls.length, 0)
})

test("donation feed preserves original links, thumbnails, authors and draft visibility", async () => {
  const calls = []
  const rows = [
    { id: "published", title: "후원 감사", content: "", images: ["first", "cover"], thumbnail_index: 1, created_by: "staff", created_at: "2026-09-01", published_at: "2026-09-02", view_count: 3 },
    { id: "draft", title: "임시저장", content: "", images: [], created_by: "staff", created_at: "2026-10-01", published_at: null, view_count: 0 },
  ]
  const api = load("src/features/daily/api/community-queries.ts", {
    "./queries": { listDailyPosts: async (options) => { assert.equal(options.community, "후원"); return { posts: [], total: 0 } } },
    "@/features/stories/api/queries": { listAdoptionStories: () => { throw Error("Donation filter must skip adoption stories") } },
    "@/features/thanks/api/queries": { listDonationThanks: async options => {
      calls.push(options)
      const filtered = rows.filter(row => options.includeDrafts || row.published_at)
      return { rows: filtered.slice(options.offset, options.offset + options.limit), total: filtered.length }
    } },
    "@/shared/lib/fetch-authors": { fetchAuthorMap: async () => ({ staff: { nickname: "운영진", role: "staff" } }) },
    "../lib/community-category": categories,
  })
  const published = await api.listCommunityPosts({ category: "후원", query: "후원" })
  assert.equal(published.total, 1)
  assert.equal(published.posts[0].href, "/thanks/published")
  assert.equal(published.posts[0].images[0], "cover")
  assert.equal(published.posts[0].author.nickname, "운영진")
  assert.equal(calls[0].query, "후원")
  const admin = await api.listCommunityPosts({ category: "후원", includeDrafts: true })
  assert.equal(admin.total, 2)
  assert.equal(admin.posts[0].id, "draft")
  assert.equal(admin.posts[0].draft, true)
})
