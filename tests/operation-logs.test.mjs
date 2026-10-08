import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"

const catalog = load("src/features/operation-logs/catalog.ts")
function runtime(file, imports, extra = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, AbortSignal, Response, Request, TextDecoder, URL, console: { warn() {} }, ...extra,
    require(name) { assert.ok(name in imports, name); return imports[name] },
  })
  return exports
}

test("logs keep only approved error codes, never raw messages, names, URLs or SQL details", () => {
  assert.equal(catalog.safeErrorCode({ code: "23505", message: "private phone", details: "private email" }), "23505")
  assert.equal(catalog.safeErrorCode({ code: "PGRST204" }), "PGRST204")
  assert.equal(catalog.safeErrorCode({ code: "sk-private", message: "secret", name: "private" }), "UNKNOWN")
  assert.equal(catalog.safeErrorCode({ name: "TimeoutError" }), "TimeoutError")
  assert.equal(catalog.safeErrorCode({ statusCode: 503 }), "HTTP_503")
  assert.equal(catalog.logArea("/admin/applications/volunteer/private-id?phone=secret"), "application")
  assert.equal(catalog.logArea("/notice/private-id?secret=1"), "post")
  assert.equal(catalog.serverErrorStep("render", "/admin/applications/volunteer/[id]"), "render.admin.applications.volunteer.detail")
  assert.doesNotMatch(catalog.serverErrorStep("private", "/private-email@example.test"), /private|@/)
})

test("logger writes a minimal payload and contains missing DB, thrown, and timeout failures", async () => {
  for (const failure of [false, "result", "throw", "timeout"]) {
    const writes = []
    const api = runtime("src/features/operation-logs/server.ts", {
      "server-only": {}, "./catalog": catalog,
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ rpc(name, value) {
        writes.push({ name, value })
        if (failure === "throw") throw Error("private error")
        return { abortSignal: async signal => { assert.ok(signal instanceof AbortSignal); if (failure === "timeout") throw Error("timeout"); return { error: failure === "result" ? {} : null } } }
      } }) },
    })
    await assert.doesNotReject(api.recordOperationError("application", "submitVolunteerApplication", { code: "23505", message: "private", details: "private" }, "application"))
    assert.deepEqual(JSON.parse(JSON.stringify(writes[0])), { name: "record_operation_error", value: { p_operation: "application", p_step: "submitVolunteerApplication", p_code: "23505", p_area: "application" } })
    await api.recordOperationError("application", "https://private.example/?token=secret")
    assert.equal(writes.length, 1)
  }
})

test("status update enforces top admin, validates input, and compares last seen to prevent resolving new failures", async () => {
  for (const scenario of ["forbidden", "invalid", "stale", "dbFailure", "success"]) {
    const calls = []
    const query = { update(value) { calls.push(value); return this }, eq(...args) { calls.push(args); return this }, select() { return this }, maybeSingle: async () => ({ data: scenario === "stale" ? null : { id: "id" }, error: scenario === "dbFailure" ? {} : null }) }
    const api = load("src/features/operation-logs/actions.ts", {
      "./catalog": catalog,
      "next/cache": { revalidatePath: path => calls.push(path) },
      "@/shared/lib/auth": { requireTopAdmin: async () => ({ ok: scenario !== "forbidden", error: "권한 없음" }) },
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: () => query }) },
    })
    const result = await api.updateLogStatus(scenario === "invalid" ? "bad" : "00000000-0000-0000-0000-000000000001", "resolved", "2026-10-08T00:00:00.123456Z")
    if (["forbidden", "invalid"].includes(scenario)) assert.equal(calls.length, 0)
    else assert.ok(calls.some(c => Array.isArray(c) && c[0] === "last_seen_at" && c[1] === "2026-10-08T00:00:00.123456Z"))
    assert.equal(!!result.ok, scenario === "success")
  }
})

test("browser reports reject cross-origin, oversized and arbitrary types; payload never carries input", async () => {
  const records = []
  const api = runtime("src/app/api/operation-errors/route.ts", {
    "@/features/operation-logs/catalog": catalog,
    "@/features/operation-logs/server": { recordOperationError: async (...args) => records.push(args) },
  })
  const request = (body, origin = "https://example.test") => new Request("https://example.test/api/operation-errors", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) })
  assert.equal((await api.POST(request({ kind: "boundary", area: "public" }, "https://other.test"))).status, 403)
  assert.equal((await api.POST(request({ kind: "arbitrary", area: "public" }))).status, 400)
  assert.equal((await api.POST(request({ kind: "boundary", area: "/secret" }))).status, 400)
  assert.equal((await api.POST(request({ text: "x".repeat(600) }))).status, 413)
  assert.equal((await api.POST(request({ kind: "boundary", area: "public", message: "private ignored" }))).status, 204)
  assert.equal((await api.POST(request({ kind: "boundary", area: "public" }))).status, 204)
  assert.equal(records.length, 1)
  assert.equal(JSON.stringify(records), '[["browser","boundary",null,"public"]]')
})

test("browser listener throttles locally and does not retry failed logging requests", async () => {
  const calls = []
  const api = runtime("src/features/operation-logs/browser.ts", { "./catalog": catalog }, {
    window: { location: { pathname: "/notice/private-id" } },
    fetch: async (...args) => { calls.push(args); throw Error("offline") },
  })
  api.reportBrowserError("boundary")
  api.reportBrowserError("boundary")
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(calls.length, 1)
  assert.equal(calls[0][1].body, '{"kind":"boundary","area":"post"}')
})

export async function renderLogs({ authorized = true, failure = false, rows = [], params = {} } = {}) {
  let reads = 0
  const q = { then(resolve) { resolve({ data: rows, count: rows.length, error: failure ? {} : null }) } }
  for (const key of ["select", "gte", "eq", "order", "range"]) q[key] = () => q
  const Page = load("src/app/(admin)/admin/(protected)/logs/page.tsx", {
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/shared/lib/auth": { requireTopAdmin: async () => ({ ok: authorized, error: "권한 없음" }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => { reads++; return { from: () => q } } },
    "@/shared/lib/utils": { formatShortDateTime: value => value.slice(2, 16).replace("T", " ").replaceAll("-", ".") },
    "@/features/operation-logs/catalog": catalog,
    "@/features/operation-logs/status-form": load("src/features/operation-logs/status-form.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/shared/components/toast": { useToast: () => ({ success() {}, error() {} }) },
      "./actions": { updateLogStatus: async () => ({ ok: true }) }, "./catalog": catalog,
    }),
  }).default
  return { html: renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) })), reads }
}

test("log page refuses staff before reading; DB failure is distinct from no failures", async () => {
  const denied = await renderLogs({ authorized: false })
  assert.equal(denied.reads, 0)
  assert.match(denied.html, /권한 없음/)
  assert.match((await renderLogs({ failure: true })).html, /SQL 적용 여부/)
  assert.match((await renderLogs()).html, /정상 동작을 보장하는 의미는 아닙니다/)
})

test("log rows disclose details, use aligned columns, and link SMS instead of copying message content", async () => {
  const row = { id: "id", operation: "sms", step: "failed", code: "UNKNOWN", area: "notification", status: "open", occurrences: 3, recurrences: 1, first_seen_at: "2026-10-08T04:00:00Z", last_seen_at: "2026-10-08T05:00:00Z" }
  const { html } = await renderLogs({ rows: [row] })
  assert.match(html, /<details/)
  assert.match(html, /재발/)
  assert.match(html, /href="\/admin\/sms"/)
  assert.equal((html.match(/grid-cols-\[9rem_minmax\(0,1fr\)_4rem_6rem_3.5rem\]/g) ?? []).length, 2)
})

test("retention job requires cron secret and only deletes records last seen over 90 days ago", async () => {
  let deleted = false
  const api = runtime("src/app/api/cron/cleanup-operation-logs/route.ts", {
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: () => ({ delete: () => ({ lt: async (column, cutoff) => { assert.equal(column, "last_seen_at"); assert.ok(Date.now() - Date.parse(cutoff) >= 90 * 86400000); deleted = true; return { error: null } } }) }) }) },
  }, { process: { env: { CRON_SECRET: "test-secret" } } })
  assert.equal((await api.GET(new Request("https://example.test"))).status, 401)
  assert.equal(deleted, false)
  assert.equal((await api.GET(new Request("https://example.test", { headers: { authorization: "Bearer test-secret" } }))).status, 200)
  assert.equal(deleted, true)
})

test("completed application update survives both returned and thrown notification errors and records partial failure", async () => {
  for (const throws of [false, true]) {
    const records = []
    const db = { from(table) {
      if (table === "notifications") return { insert: async () => { if (throws) throw Error("private payload"); return { error: { code: "23505", message: "private" } } } }
      return { select() { return this }, update() { return this }, eq() { return this }, then: resolve => resolve({ error: null }), maybeSingle: async () => ({ data: { created_by: "owner", status: "접수" } }) }
    } }
    const api = load("src/features/applications/api/mutations.ts", {
      "next/cache": { revalidatePath() {} }, "next/navigation": {},
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true, userId: "admin" }) },
      "@/shared/lib/supabase/server": { createClient: async () => db },
      "@/shared/lib/supabase/admin": { createAdminClient: () => db },
      "@/features/operation-logs/server": { recordOperationError: async (...args) => records.push(args) },
      "@/features/push": { sendPushToUser: async () => {} },
      "@/features/events/lib/date": {}, "@/features/events/types": {},
      "../lib/volunteer-applicant": {}, "../lib/volunteer-operating-hours": {}, "@/shared/lib/validation": {},
    })
    const form = new FormData()
    form.set("status", "승인")
    assert.equal((await api.updateAdoptionApplication("application", form)).id, "application")
    assert.equal(records.length, 1)
    assert.equal(records[0][1], "adoptionInAppNotification")
  }
})
