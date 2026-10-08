import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { load } from "./helpers/page-review-fixtures.mjs"

test("sitemap uses public data without cookies and restricts notice URLs to the notice board", async () => {
  const calls = []
  const sitemap = load("src/app/sitemap.ts", {
    "@/shared/constants/site": { SITE: { url: "https://example.test" } },
    "@/shared/lib/supabase/public": { createPublicClient: () => ({ from(table) {
      calls.push(["from", table])
      return {
        select() { return this },
        eq(key, value) { calls.push([table, key, value]); return this },
        not(key, op, value) { calls.push([table, key, op, value]); return this },
        order: async () => ({ data: [{ id: table, updated_at: "2026-10-08", posted_at: "2026-10-08" }], error: null }),
      }
    } }) },
  }).default
  const result = await sitemap()
  for (const path of ["/dogs/dogs", "/cats/cats", "/daily/daily_posts", "/stories/adoption_stories", "/notice/notices"]) assert.ok(result.some(row => row.url.endsWith(path)))
  assert.ok(calls.some(row => row.join(":") === "notices:board_type:notice"))
  assert.doesNotMatch(fs.readFileSync("src/shared/lib/supabase/public.ts", "utf8"), /next\/headers|SERVICE_ROLE/)
})

test("favicon and install icons reference text-free assets with exact declared dimensions", () => {
  const manifest = load("src/app/manifest.ts", { "@/shared/constants/site": { SITE: { name: "왕왕랜드" } } }).default()
  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync(`public${icon.src}`)
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes)
    assert.match(icon.src, /wangwang-symbol/)
  }
  for (const size of [32, 180]) {
    const bytes = fs.readFileSync(`public/images/wangwang-symbol-${size}.png`)
    assert.equal(bytes.readUInt32BE(16), size)
    assert.equal(bytes.readUInt32BE(20), size)
  }
  const layout = fs.readFileSync("src/app/layout.tsx", "utf8")
  assert.match(layout, /wangwang-symbol-32.png/)
  assert.match(layout, /wangwang-symbol-180.png/)
})

test("agreement all-selected value is derived and notice subscriptions clean up listeners", () => {
  for (const file of ["agreement-form", "onboarding-form"]) {
    const source = fs.readFileSync(`src/features/members/components/${file}.tsx`, "utf8")
    assert.match(source, /const agreeAll = /)
    assert.doesNotMatch(source, /setAgreeAll/)
  }
  const source = fs.readFileSync("src/features/notices/hooks/use-notice-seen.ts", "utf8")
  assert.match(source, /removeEventListener\("storage", onStorage\)/)
  assert.match(fs.readFileSync("src/shared/components/search-box.tsx", "utf8"), /clearTimeout\(debounceRef.current\)/)
})
