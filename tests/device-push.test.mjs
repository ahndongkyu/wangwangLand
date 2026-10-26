import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import { load } from "./helpers/page-review-fixtures.mjs"

function device({ permission = "granted", linked = true, existing = true, saveError = false, removeError = false, ios = false, standalone = false, queryError = false } = {}) {
  const calls = []
  const sub = { endpoint: "https://push.example/one", toJSON: () => ({ keys: { p256dh: "key", auth: "auth" } }), unsubscribe: async () => { calls.push("unsubscribe"); return true } }
  const reg = { pushManager: { getSubscription: async () => existing ? sub : null, subscribe: async () => { calls.push("subscribe"); return sub } } }
  const api = { getPushSubscriptionStatus: async () => { calls.push("status"); return { subscribed: linked, error: queryError ? "query failed" : undefined } }, subscribePush: async () => { calls.push("save"); return { error: saveError ? "save failed" : undefined } }, unsubscribePush: async () => { calls.push("remove"); return { error: removeError ? "remove failed" : undefined } } }
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync("src/features/push/lib/device.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, require: () => api, setTimeout, clearTimeout, Uint8Array, atob, navigator: { userAgent: ios ? "iPhone" : "Chrome", platform: "", serviceWorker: { ready: Promise.resolve(reg), getRegistration: async () => reg } }, window: { PushManager: {}, Notification: {} }, matchMedia: () => ({ matches: standalone }), Notification: { permission, requestPermission: async () => { calls.push("permission"); return permission } } })
  return { api: exports, calls }
}

test("device status never asks permission and distinguishes installation, blocked, off and linked", async () => {
  for (const [options, expected] of [[{ ios: true }, "install"], [{ permission: "denied" }, "blocked"], [{ permission: "default" }, "off"], [{ existing: false }, "off"], [{ linked: false }, "off"], [{}, "on"]]) {
    const f = device(options)
    assert.equal(await f.api.readDevicePushState(), expected)
    assert.ok(!f.calls.includes("permission"))
  }
})
test("permission request precedes asynchronous registration; failed saves do not claim success", async () => {
  const f = device({ existing: false, saveError: true })
  await assert.rejects(f.api.connectDevicePush("YWJj"), /save failed/)
  assert.deepEqual(f.calls, ["permission", "subscribe", "save"])
  const denied = device({ permission: "denied" })
  assert.equal(await denied.api.connectDevicePush("YWJj"), false)
  assert.deepEqual(denied.calls, ["permission"])
})
test("old account subscription is replaced only after status check; read failures remain failures", async () => {
  const f = device({ linked: false })
  assert.equal(await f.api.connectDevicePush("YWJj"), true)
  assert.deepEqual(f.calls, ["permission", "status", "unsubscribe", "subscribe", "save"])
  await assert.rejects(device({ queryError: true }).api.readDevicePushState(), /query failed/)
})
test("device disconnection checks server errors before browser unsubscribe", async () => {
  const failed = device({ removeError: true })
  await assert.rejects(failed.api.disconnectDevicePush(), /remove failed/)
  assert.deepEqual(failed.calls, ["remove"])
  const success = device()
  await success.api.disconnectDevicePush()
  assert.deepEqual(success.calls, ["remove", "unsubscribe"])
  const empty = device({ existing: false })
  await empty.api.disconnectDevicePush()
  assert.deepEqual(empty.calls, [])
})
test("subscription endpoints always scope reads and deletes to authenticated member", async () => {
  for (const loggedIn of [true, false]) {
    const calls = []
    const chain = { select() { return this }, delete() { calls.push("delete"); return this }, eq(...args) { calls.push(args); return this }, maybeSingle: async () => ({ data: { id: "row" }, error: null }), then(resolve) { resolve({ error: null }) } }
    const api = load("src/features/push/api/actions.ts", {
      "web-push": {}, "@/features/operation-logs/catalog": {}, "@/shared/constants/site": { SITE: { url: "https://example.test" } },
      "@/shared/lib/supabase/admin": {},
      "@/shared/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: loggedIn ? { id: "member" } : null } }) }, from: () => chain }) },
    })
    const status = await api.getPushSubscriptionStatus("endpoint")
    const removed = await api.unsubscribePush("endpoint")
    assert.equal(status.subscribed, loggedIn)
    assert.equal(!!removed.error, !loggedIn)
    if (loggedIn) assert.equal(calls.filter(c => Array.isArray(c) && c[0] === "user_id" && c[1] === "member").length, 2)
    else assert.equal(calls.length, 0)
  }
})
