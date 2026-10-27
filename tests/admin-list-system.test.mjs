import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

const { deleteSelectedItems } = load("src/shared/lib/admin-list.ts")
test("selection delete keeps failures and exceptions, deduplicates IDs, reports only confirmed successes", async () => {
  const calls = []
  const result = await deleteSelectedItems(["ok", "bad", "offline", "ok"], async id => {
    calls.push(id)
    if (id === "offline") throw Error("offline")
    return id === "bad" ? { error: "not authorized" } : {}
  })
  assert.deepEqual(calls, ["ok", "bad", "offline"])
  assert.deepEqual(Array.from(result.succeeded), ["ok"])
  assert.deepEqual(Array.from(result.failed), ["bad", "offline"])
})

function database(tables, fail = false) {
  const calls = []
  return { calls, from(table) {
    let data = [...(tables[table] ?? [])], head = false, start = 0, end = Infinity
    const orders = []
    const q = {
      select(_fields, options = {}) { head = options.head; return q },
      eq(field, value) { calls.push([table, field, value]); data = data.filter(row => row[field] === value); return q },
      in(field, values) { calls.push([table, field, [...values]]); data = data.filter(row => values.includes(row[field])); return q },
      or() { return q },
      order(field, { ascending }) { orders.push([field, ascending]); return q },
      range(a, b) { start = a; end = b; return q },
      then(resolve) {
        data.sort((a, b) => { for (const [field, asc] of orders) { const c = String(a[field]).localeCompare(String(b[field])); if (c) return asc ? c : -c } return 0 })
        return Promise.resolve({ data: head ? null : data.slice(start, end + 1), count: data.length, error: fail ? { message: "DB unavailable" } : null }).then(resolve)
      },
    }
    return q
  } }
}

function memberApi(db) {
  return load("src/features/members/api/queries.ts", {
    "@/shared/lib/member-role": { normalizeMemberRole: role => role },
    "next/cache": { unstable_cache: fn => fn },
    "@/shared/lib/month-windows": {}, "@/shared/lib/privacy-audit": {}, "@/shared/constants/home-navigation": {},
    "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true }) },
    "@/shared/lib/supabase/server": { createClient: async () => db },
    "@/shared/lib/supabase/admin": { createAdminClient: () => db },
  })
}
test("member status pagination places pending before approved before rejected across page boundaries", async () => {
  const profiles = ["approved", "pending", "rejected", "pending", "approved"].map((status, i) => ({ id: String(i), status, role: "member", created_at: `2026-10-${10+i}`, nickname: `member${i}` }))
  const api = memberApi(database({ profiles }))
  const first = await api.listProfiles({ limit: 3 })
  const second = await api.listProfiles({ limit: 3, offset: 3 })
  assert.deepEqual(Array.from(first.profiles, row => row.id), ["3", "1", "4"])
  assert.deepEqual(Array.from(second.profiles, row => row.id), ["0", "2"])
  assert.equal(first.total, 5)
  assert.equal(first.pendingCount, 2)
  const filtered = await api.listProfiles({ status: "approved", limit: 20 })
  assert.deepEqual(Array.from(filtered.profiles, row => row.id), ["4", "0"])
})
test("member query failure is not presented as an empty result", async () => {
  await assert.rejects(memberApi(database({}, true)).listProfiles(), /불러오지 못했습니다/)
})

function applications(db, authorized = true) {
  return load("src/features/applications/api/queries.ts", {
    "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized }) },
    "@/shared/lib/supabase/server": { createClient: async () => db },
    "@/shared/lib/supabase/admin": { createAdminClient: () => db },
    "@/shared/lib/privacy-audit": {}, "@/shared/lib/month-windows": {}, "@/shared/lib/volunteer-stats": {},
  })
}
test("member history uses account ID regardless of email and rejects unrelated matching emails", async () => {
  const rows = [{ id: "mine", created_by: "member", email: "old@example.test" }, { id: "other", created_by: "other", email: "new@example.test" }]
  const db = database({ adoption_applications: rows, volunteer_applications: rows })
  const result = await applications(db).listApplicationsByMemberId("member")
  assert.deepEqual(Array.from(result.volunteer, row => row.id), ["mine"])
  assert.deepEqual(Array.from(result.adoption, row => row.id), ["mine"])
  assert.ok(db.calls.every(call => call[1] === "created_by"))
  db.calls.length = 0
  await applications(db, false).listApplicationsByMemberId("member")
  assert.equal(db.calls.length, 0)
})
test("calendar pending count includes review and reschedule requests beyond five visible rows", async () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({ id: i, status: ["접수", "검토중", "일정변경요청"][i%3], submitted_at: `2026-10-${10+i}` }))
  const result = await applications(database({ volunteer_applications: rows })).listVolunteerApplications({ statuses: ["접수", "검토중", "일정변경요청"], limit: 5 })
  assert.equal(result.total, 9)
  assert.equal(result.rows.length, 5)
})
test("mixed-board delete validates source and authorization before dispatch", async () => {
  for (const authorized of [true, false]) {
    const calls = []
    const api = load("src/features/daily/api/admin-community.ts", {
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized, error: "denied" }) },
      "./mutations": { deleteDailyPost: async id => { calls.push(["daily", id]); return {} } },
      "@/features/stories/api/mutations": { deleteAdoptionStory: async id => { calls.push(["story", id]); return {} } },
      "@/features/thanks/api/mutations": { deleteDonationThanks: async id => { calls.push(["thanks", id]); return {} } },
    })
    const id = "12345678-1234-1234-1234-123456789012"
    for (const source of ["daily", "story", "thanks"]) await api.deleteCommunityPost(`${source}:${id}`)
    assert.equal(calls.length, authorized ? 3 : 0)
    assert.ok((await api.deleteCommunityPost(`members:${id}`)).error)
    assert.ok((await api.deleteCommunityPost("daily:bad")).error)
  }
})
