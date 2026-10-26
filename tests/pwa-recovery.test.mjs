import test from "node:test"
import assert from "node:assert/strict"
import vm from "node:vm"
import { readFileSync } from "node:fs"

function worker({ clients = [], fails = false } = {}) {
  const events = {}, opened = [], cached = [], removed = []
  const offline = new Response("offline")
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL, Response, Request: class { constructor(url, options) { this.url = url; Object.assign(this, options) } },
    fetch: async () => { if (fails) throw Error("network"); return new Response("private page") },
    caches: { open: async () => ({ add: async request => cached.push(request.url), match: async () => offline }), keys: async () => ["wangwang-offline-v0", "unrelated"], delete: async key => removed.push(key) },
    self: { location: { origin: "https://wangwangland.kr" }, addEventListener: (name, fn) => events[name] = fn, skipWaiting: async () => {}, clients: { claim: async () => {}, matchAll: async () => clients, openWindow: async url => opened.push(url) } },
  })
  return { events, opened, cached, removed }
}
async function click(w, url) {
  let pending
  w.events.notificationclick({ notification: { close() {}, data: { url } }, waitUntil(value) { pending = value } })
  await pending
}
test("notification focuses only exact target and never navigates a writing tab", async () => {
  let focused = 0
  const w = worker({ clients: [{ url: "https://wangwangland.kr/write", navigate() { assert.fail("writing tab navigated") }, focus() { assert.fail("wrong tab focused") } }, { url: "https://wangwangland.kr/my", focus() { focused++ } }] })
  await click(w, "/my")
  assert.equal(focused, 1)
  await click(w, "/notice/1")
  assert.deepEqual(w.opened, ["https://wangwangland.kr/notice/1"])
})
test("notification rejects external, javascript and malformed targets", async () => {
  const w = worker()
  for (const url of ["https://evil.test/", "javascript:alert(1)", "http://[", "https://wangwangland.kr.evil.test"]) await click(w, url)
  assert.deepEqual(w.opened, Array(4).fill("https://wangwangland.kr/"))
})
test("only public offline guide is cached and unrelated caches are retained", async () => {
  const w = worker()
  let pending
  w.events.install({ waitUntil(p) { pending = p } }); await pending
  w.events.activate({ waitUntil(p) { pending = p } }); await pending
  assert.deepEqual(w.cached, ["/offline.html"])
  assert.deepEqual(w.removed, ["wangwang-offline-v0"])
})
test("offline fallback is limited to GET document navigation; no mutation or API replay", async () => {
  const w = worker({ fails: true })
  let response
  const fire = (request) => w.events.fetch({ request: { method: "GET", mode: "navigate", url: "https://wangwangland.kr/my", ...request }, respondWith(p) { response = p } })
  for (const request of [{ method: "POST" }, { mode: "cors" }, { url: "https://wangwangland.kr/api/documents" }, { url: "https://other.test/" }]) { response = null; fire(request); assert.equal(response, null) }
  fire({}); assert.equal(await (await response).text(), "offline")
  assert.deepEqual(w.cached, [])
})
test("successful private pages remain network-only", async () => {
  const w = worker()
  let response
  w.events.fetch({ request: { method: "GET", mode: "navigate", url: "https://wangwangland.kr/my" }, respondWith(p) { response = p } })
  assert.equal(await (await response).text(), "private page")
  assert.deepEqual(w.cached, [])
})
