import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"

test("recurring edits use one atomic RPC and notify only committed IDs", async () => {
  for (const scope of ["after", "all"]) for (const fail of [false, true]) {
    const sent = [], calls = []
    const api = load("src/features/events/api/mutations.ts", {
      crypto: {}, "next/cache": { revalidatePath() {} },
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true }) },
      "@/shared/lib/supabase/server": {},
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({
        rpc: async (name, args) => { calls.push({ name, args }); return { data: fail ? null : ["one", "two"], error: fail ? { message: "rollback" } : null } },
        from() { throw Error("No per-row writes") },
      }) },
      "../notify": { dispatchEventNotification: async ({ eventId }) => sent.push(eventId) },
      "../lib/date": load("src/features/events/lib/date.ts"), "../lib/recurrence": {}, "../types": { INTERNAL_CATEGORIES: [] },
    })
    const form = new FormData()
    form.set("title", "행사"); form.set("category", "event"); form.set("starts_at", "2026-10-20T15:30")
    const result = await api.updateEvent("anchor", form, scope)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].name, "update_recurring_events_atomic")
    assert.equal(calls[0].args.p_scope, scope)
    assert.equal(calls[0].args.p_fields.starts_at, "2026-10-20T06:30:00.000Z")
    assert.deepEqual(sent, fail ? [] : ["one", "two"])
    if (fail) assert.ok(result.error)
    else assert.equal(result.count, 2)
  }
})

function notificationApi({ kind = "volunteer", owner = "owner", fail, explicit = false } = {}) {
  const reads = []
  const rows = []
  const pushes = []
  const api = load("src/features/events/notify.ts", {
    "server-only": {},
    "@/features/push": { sendPushToUser: async (message, userId) => pushes.push({ message, userId }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from(table) {
      reads.push(table)
      const result = () => ({ error: fail === table ? { message: "failed" } : null,
        data: table === "events" ? { title: "봉사 일정", source_application_type: kind, source_application_id: "app" }
          : table === "event_signups" ? [{ user_id: "owner" }, { user_id: "signup" }, { user_id: "signup" }]
          : { created_by: owner } })
      return { select() { return this }, eq() { return this }, order() { return this },
        maybeSingle: async () => result(), range: async () => result(),
        insert: async (value) => { rows.push(...value); return { error: null } },
      }
    } }) },
  })
  return { api, reads, rows, pushes, explicit }
}

test("event notifications merge linked application owners and active signups without duplicates", async () => {
  for (const kind of ["volunteer", "adoption"]) {
    const fixture = notificationApi({ kind, owner: "linked" })
    const snapshot = await fixture.api.prepareEventNotification("event")
    assert.deepEqual([...snapshot.userIds], ["owner", "signup", "linked"])
    await fixture.api.dispatchEventNotification({ eventId: "event", type: "event_changed", snapshot })
    assert.equal(fixture.rows.length, 3)
    assert.equal(fixture.pushes.length, 3)
    assert.ok(fixture.pushes.every(({ message }) => message.body.includes("봉사 일정")))
    assert.equal(fixture.reads.filter((table) => table === "events").length, 1)
  }
  assert.deepEqual([...(await notificationApi().api.prepareEventNotification("event")).userIds], ["owner", "signup"])
})

test("explicit signup confirmation targets only its member and cancellation uses saved title", async () => {
  const fixture = notificationApi()
  const snapshot = await fixture.api.prepareEventNotification("event", "only")
  assert.deepEqual([...snapshot.userIds], ["only"])
  assert.deepEqual(fixture.reads, ["events"])
  await fixture.api.dispatchEventNotification({ eventId: "event", type: "event_canceled", snapshot })
  assert.equal(fixture.pushes[0].message.url, "/my/applications")
  assert.match(fixture.pushes[0].message.body, /봉사 일정/)
})

test("recipient lookup failures are not treated as empty recipients", async () => {
  for (const fail of ["events", "event_signups", "volunteer_applications"]) {
    const fixture = notificationApi({ fail })
    await assert.rejects(fixture.api.prepareEventNotification("event"))
    assert.equal(fixture.rows.length, 0)
  }
})

test("deletion sends only after successful deletion and only for returned deleted rows", async () => {
  for (const mode of ["success", "failure", "missing", "lookup-failure"]) {
    const calls = []
    const api = load("src/features/events/api/mutations.ts", {
      crypto: {}, "next/cache": { revalidatePath() {} },
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true }) },
      "@/shared/lib/supabase/server": {},
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from() { return {
        delete() { calls.push("delete"); return this }, in() { return this },
        select: async () => ({ data: mode === "missing" ? [] : [{ id: "event" }], error: mode === "failure" ? { message: "failed" } : null }),
      } } }) },
      "../notify": {
        prepareEventNotification: async (eventId) => {
          calls.push("prepare")
          if (mode === "lookup-failure") throw Error("failed")
          return { eventId, userIds: ["owner"], title: "일정" }
        },
        dispatchEventNotification: async (opts) => { assert.equal(opts.snapshot.title, "일정"); calls.push("send") },
      },
      "../lib/date": {}, "../lib/recurrence": {}, "../types": {},
    })
    const result = await api.deleteEvent("event")
    if (mode === "success") {
      assert.deepEqual(calls, ["prepare", "delete", "send"])
      assert.equal(result.count, 1)
    } else {
      assert.ok(!calls.includes("send"))
      if (mode === "lookup-failure") assert.deepEqual(calls, ["prepare"])
      if (mode === "missing") assert.equal(result.count, 0)
      else assert.ok(result.error)
    }
  }
})
