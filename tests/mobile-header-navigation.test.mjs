import assert from "node:assert/strict"
import test from "node:test"
import { load } from "./helpers/page-review-fixtures.mjs"
const { mobileHeaderRoute: route, mobileHeaderReturnHref: back } = load("src/shared/lib/mobile-header-navigation.ts")

test("home and list pages retain branding without a back button", () => {
  for (const path of ["/", "/admin", "/daily", "/admin/applications", "/admin/members", "/calendar/list", "/calendar/grid", "/admin/settings/contact"]) assert.equal(route(path), null)
})
test("public and admin details, forms and own applications have valid fallback lists", () => {
  for (const [path, href] of [
    ["/daily/post", "/daily"], ["/notice/post", "/notice"], ["/dogs/dog", "/dogs"],
    ["/stories/post/edit", "/daily"], ["/expenses/post", "/expenses"],
    ["/admin/applications/volunteer/id", "/admin/applications?type=volunteer"],
    ["/admin/applications/adoption/id", "/admin/applications?type=adoption"],
    ["/admin/members/id", "/admin/members"], ["/admin/sms/id", "/admin/sms"],
    ["/admin/calendar/id/edit", "/admin/calendar"], ["/admin/dogs/new", "/admin/dogs"],
    ["/admin/daily/id/edit", "/admin/community"],
    ["/my/applications/adoption/id", "/my/applications"],
    ["/my/applications/volunteer/id/edit", "/my/applications"],
  ]) assert.equal(route(path).href, href, path)
})
test("safe return routes retain filters and calendar context, unsafe destinations fall back", () => {
  const detail = route("/admin/applications/volunteer/id")
  for (const value of ["/admin/applications?type=volunteer&page=2", "/admin/calendar?ym=2026-10&date=2026-10-28", "/#volunteer-calendar"]) assert.equal(back(detail, value), value)
  for (const value of [null, "https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/admin/members", "/admin/calendar/../members", "/%2f%2fevil.test"]) assert.equal(back(detail, value), detail.href)
  assert.equal(back(route("/daily/post"), "/daily?page=3&type=free"), "/daily?page=3&type=free")
})
