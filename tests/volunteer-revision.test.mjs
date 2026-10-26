import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

test("revision checks require staff and expose only status and version", async () => {
  for (const allowed of [false, true]) {
    let queried = false
    const api = load("src/features/applications/api/volunteer-revision.ts", {
      "@/shared/lib/auth": { requireAdmin: async () => allowed ? { ok: true } : { ok: false, error: "운영진 권한이 없습니다." } },
      "@/shared/lib/supabase/admin": { createAdminClient: () => {
        assert.ok(allowed)
        return { from: table => {
          assert.equal(table, "volunteer_applications"); queried = true
          return { select(fields) { assert.equal(fields, "status, updated_at"); return this }, eq(key, value) { assert.equal(key, "id"); assert.equal(value, "app"); return this }, maybeSingle: async () => ({ data: { status: "승인", updated_at: "new" }, error: null }) }
        } }
      } },
    })
    const result = await api.getVolunteerRevision("app")
    assert.equal(queried, allowed)
    assert.equal(!!result.error, !allowed)
    if (allowed) assert.equal(result.revision.status, "승인")
  }
})
