import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

test("every schedule mutation scope rejects unauthorized callers before DB access", async () => {
  let checks = 0
  const forbidden = () => { throw Error("Database must not be accessed") }
  const api = load("src/features/events/api/mutations.ts", {
    crypto: {}, "next/cache": {},
    "@/shared/lib/supabase/server": { createClient: forbidden },
    "@/shared/lib/supabase/admin": { createAdminClient: forbidden },
    "@/shared/lib/auth": { requireAdmin: async () => { checks++; return { ok: false, error: "운영진 권한이 없습니다." } } },
    "../notify": {}, "../lib/date": {}, "../lib/recurrence": {}, "../types": {},
    "../volunteer-notice": {},
  })
  for (const scope of ["one", "after", "all"]) {
    assert.match((await api.updateEvent("event", new FormData(), scope)).error, /권한/)
    assert.match((await api.deleteEvent("event", scope)).error, /권한/)
  }
  assert.equal(checks, 6)
})

test("own cancellation uses authenticated atomic RPC, never separate writes", async () => {
  for (const type of ["volunteer", "adoption"]) {
    const calls = []
    const api = load("src/features/applications/api/mutations.ts", {
      "next/cache": { revalidatePath() {} }, "next/navigation": {}, "@/shared/lib/auth": {},
      "@/features/push": { sendPushToStaff: async (message, userId) => {
        assert.equal(calls.length, 1)
        assert.equal(userId, "owner")
        assert.equal(message.url, `/admin/applications/${type}/application`)
      } },
      "@/shared/lib/supabase/server": { createClient: async () => ({
        auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } } }) },
        rpc: async (name, args) => { calls.push({ name, args }); return { error: null } },
      }) },
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from(table) {
        assert.equal(table, `${type}_applications`)
        return { select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { created_by: "owner", status: "승인" } }) }
      } }) },
      "@/features/events/lib/date": {}, "@/features/events/types": {},
      "../lib/volunteer-applicant": {}, "../lib/volunteer-operating-hours": {}, "@/shared/lib/validation": {},
    })
    const action = type === "volunteer" ? api.cancelOwnVolunteerApplication : api.cancelOwnAdoptionApplication
    assert.equal((await action("application", " 사정으로 취소 ")).id, "application")
    assert.equal(calls.length, 1)
    assert.equal(calls[0].name, "cancel_own_application_with_events")
    assert.equal(calls[0].args.p_application_type, type)
    assert.equal(calls[0].args.p_cancel_reason, "사정으로 취소")
  }
})
