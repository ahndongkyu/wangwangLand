import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

test("notification constraint preserves comments and matches every declared application/event type", () => {
  const source = fs.readFileSync("src/features/notifications/api/queries.ts", "utf8")
  const union = source.slice(source.indexOf("export type NotificationType"), source.indexOf("export interface"))
  const types = [...union.matchAll(/"([a-z_]+)"/g)].map(m => m[1]).sort()
  const sql = fs.readFileSync("supabase/migrations/20261008000006_notification_types.sql", "utf8")
  const allowed = [...sql.matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort()
  assert.deepEqual(allowed, types)
  assert.ok(allowed.includes("comment_on_post") && allowed.includes("reply_to_comment"))
  assert.match(sql, /begin;[\s\S]*alter table[\s\S]*commit;/)
  assert.doesNotMatch(sql, /\b(?:insert into|delete from|update public)\b/i)
})

function pushFixture({ subscriptions = [], statusCode, configured = true, queryError = false } = {}) {
  const records = [], sent = [], removed = []
  const imports = {
    "@/features/operation-logs/server": { recordOperationError: async (...args) => records.push(args) },
    "@/shared/lib/supabase/server": {},
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: () => ({
      select() { return this }, in() { return this },
      then(resolve) { resolve({ data: subscriptions, error: queryError ? { code: "PGRST204" } : null }) },
      delete() { return { in: async (_, ids) => { removed.push(...ids); return { error: null } } } },
    }) }) },
    "@/shared/constants/site": { SITE: { url: "https://example.test" } },
    "web-push": { default: { setVapidDetails() {}, sendNotification: async () => { sent.push(true); if (statusCode) throw { statusCode } } } },
  }
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/features/push/api/actions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, process: { env: configured ? { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "fixture", VAPID_PRIVATE_KEY: "fixture" } : {} },
    require: name => { assert.ok(name in imports, name); return imports[name] },
  })
  return { api: exports, records, sent, removed }
}

test("member without a push subscription is skipped without an error log", async () => {
  const f = pushFixture()
  await f.api.sendPushToUser({ title: "test", body: "test" }, "member")
  assert.equal(f.sent.length, 0)
  assert.equal(f.records.length, 0)
})

test("expired 404/410 subscriptions are removed but do not become operational errors", async () => {
  for (const statusCode of [404, 410]) {
    const f = pushFixture({ subscriptions: [{ id: "expired", endpoint: "fixture", p256dh: "fixture", auth: "fixture" }], statusCode })
    await f.api.sendPushToUser({ title: "test", body: "test" }, "member")
    assert.equal(f.sent.length, 1)
    assert.deepEqual(f.removed, ["expired"])
    assert.equal(f.records.length, 0)
  }
})

test("delivery outages, query failures and missing server keys remain visible", async () => {
  for (const [options, step] of [
    [{ subscriptions: [{ id: "active" }], statusCode: 503 }, "automaticDelivery"],
    [{ queryError: true }, "subscriptions"],
    [{ configured: false }, "configuration"],
  ]) {
    const f = pushFixture(options)
    await f.api.sendPushToUser({ title: "test", body: "test" }, "member")
    assert.equal(f.records.length, 1)
    assert.equal(f.records[0][1], step)
    assert.equal(f.removed.length, 0)
  }
})
