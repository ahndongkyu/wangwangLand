import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsx from "react/jsx-runtime"

function load(file, imports = {}, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  vm.runInNewContext(code, { exports, Date, ...globals, require(name) {
    assert.ok(name in imports, name)
    return imports[name]
  } })
  return exports
}
const recent = load("src/shared/lib/recent-post.ts")
const now = Date.parse("2026-10-06T06:00:00Z")
test("new marker uses exactly 48 hours and rejects invalid/future dates", () => {
  for (const age of [0, 1, recent.NEW_POST_WINDOW_MS - 1]) assert.equal(recent.isRecentPost(new Date(now - age).toISOString(), now), true)
  for (const age of [recent.NEW_POST_WINDOW_MS, recent.NEW_POST_WINDOW_MS + 1, -1]) assert.equal(recent.isRecentPost(new Date(now - age).toISOString(), now), false)
  for (const date of ["", "invalid"]) assert.equal(recent.isRecentPost(date, now), false)
  assert.equal(recent.isRecentPost("2026-10-06T15:00:00+09:00", now), true)
})
test("badge subscribes to expiry, clears timer and hides after 48 hours", () => {
  let clock = now, subscriber, snapshot, fallback, timeout, cleared = false, listener
  const { NewPostBadge } = load("src/shared/components/new-post-badge.tsx", {
    "react/jsx-runtime": jsx, "@/shared/lib/recent-post": recent,
    react: { useCallback: fn => fn, useSyncExternalStore(sub, get, server) { subscriber = sub; snapshot = get; fallback = server; return get() } },
  }, {
    Date: class extends Date { static now() { return clock } },
    window: { setTimeout(fn, ms) { timeout = { fn, ms }; return 1 }, clearTimeout(id) { cleared = id === 1 } },
    document: { addEventListener(event, fn) { assert.equal(event, "visibilitychange"); listener = fn }, removeEventListener(event, fn) { assert.equal(fn, listener) } },
  })
  const date = new Date(now - recent.NEW_POST_WINDOW_MS + 1000).toISOString()
  assert.ok(NewPostBadge({ date }))
  assert.equal(fallback(), false, "stable server/hydration snapshot")
  let fresh
  const cleanup = subscriber(() => { fresh = snapshot() })
  assert.equal(timeout.ms, 1000)
  clock += 1000
  timeout.fn()
  assert.equal(fresh, false)
  assert.equal(NewPostBadge({ date }), null)
  cleanup()
  assert.equal(cleared, true)
})
test("both home renderers put the badge before title and motion reduction disables glow", () => {
  for (const file of ["home-story-card", "home-post-row"]) {
    const source = fs.readFileSync(`src/shared/components/${file}.tsx`, "utf8")
    assert.ok(source.indexOf('<NewPostBadge date={date}') < source.indexOf('>{title}'))
  }
  const css = fs.readFileSync("src/app/globals.css", "utf8")
  assert.match(css, /animation: home-new-post-glow 2\.5s ease-in-out infinite/)
  assert.match(css, /filter: brightness\(1\.25\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.home-new-post-badge \{ animation: none/)
})
