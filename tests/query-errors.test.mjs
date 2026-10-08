import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

function client(failTable, applications = []) {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } } }) },
    from(table) {
      const q = { then(resolve) { resolve({ data: table === "volunteer_applications" ? applications : [], count: 0, error: table === failTable ? { message: "unavailable" } : null }) } }
      for (const method of ["select", "eq", "neq", "order", "range", "not", "is", "in", "gte", "lt", "limit"]) q[method] = () => q
      return q
    },
  }
}

test("notice lists distinguish failed queries from genuinely empty results", async () => {
  for (const failed of [true, false]) for (const includeDrafts of [true, false]) {
    const api = load("src/features/notices/api/queries.ts", {
      "@/shared/lib/supabase/server": { createClient: async () => client(failed ? "notices" : null) },
      "@/shared/lib/fetch-authors": { fetchAuthorMap: async () => ({}) },
    })
    if (failed) await assert.rejects(api.listNotices({ includeDrafts }), /불러오지/)
    else assert.equal((await api.listNotices({ includeDrafts })).notices.length, 0)
  }
})

test("my upcoming events fail visibly if any of the three source queries fail", async () => {
  for (const table of ["volunteer_applications", "events", "event_signups", null]) {
    const db = client(table, [{ id: "application" }])
    const api = load("src/features/events/api/queries.ts", {
      "@/shared/lib/supabase/server": { createClient: async () => db },
      "@/shared/lib/supabase/admin": { createAdminClient: () => db },
    })
    if (table) await assert.rejects(api.listMyUpcomingEvents(), /불러오지/)
    else assert.equal((await api.listMyUpcomingEvents()).length, 0)
  }
})
