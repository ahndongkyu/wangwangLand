import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

test("cumulative volunteer count pages beyond 1000 records and includes approved reschedules", async () => {
  const offsets = []
  const api = load("src/shared/lib/volunteer-stats.ts", {
    "server-only": {},
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from(table) {
      assert.equal(table, "volunteer_applications")
      return { select() { return this },
        or(filter) { assert.equal(filter, "status.eq.승인,and(status.eq.일정변경요청,approved_at.not.is.null)"); return this },
        order(field) { assert.equal(field, "id"); return this },
        range: async (start, end) => {
          offsets.push(start); assert.equal(end - start, 499)
          return { data: Array.from({ length: Math.min(500, 1201 - start) }, (_, i) => ({ id: `${start + i}`, party_size: start + i === 1200 ? null : 2 })), error: null }
        },
      }
    } }) },
  })
  assert.equal(await api.sumApprovedVolunteerPeople(), 2401)
  assert.deepEqual(offsets, [0, 500, 1000])
})

test("public stats distinguish unavailable volunteer aggregate from zero", async () => {
  for (const fail of [false, true]) {
    const api = load("src/shared/lib/stats.ts", {
      "./volunteer-stats": { sumApprovedVolunteerPeople: async () => { if (fail) throw Error("offline"); return 0 } },
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from() { return { select() { return this }, eq: async () => ({ count: 2, error: null }) } } }) },
    })
    assert.equal((await api.getSiteStats()).volunteers, fail ? null : 0)
  }
})
