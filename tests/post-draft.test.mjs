import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function draftFixture(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage)), slots = [], timers = new Map(), listeners = new Map()
  let index = 0, serial = 0, effects = [], result
  const hooks = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = v }] },
    useRef(initial) { const i = index++; return slots[i] ??= { current: initial } },
    useCallback(fn) { return fn },
    useEffect(fn, deps) { const i = index++; const old = slots[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) { effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) } },
  }
  const exports = {}
  const source = fs.readFileSync("src/shared/hooks/use-draft-save.ts", "utf8")
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, require: () => hooks, queueMicrotask: fn => fn(),
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: fn => { timers.set(++serial, fn); return serial }, clearTimeout: id => timers.delete(id),
    window: { addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event) },
  })
  return {
    render(key, value, enabled = true) { index = 0; effects = []; result = exports.useDraftSave(key, value, enabled); effects.forEach(fn => fn()); return result },
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()) },
    leave() { listeners.get("pagehide")?.() }, storage,
  }
}

test("existing body draft survives initial empty renders until explicit restore", () => {
  const saved = JSON.stringify({ value: "<p>작성 중</p>", savedAt: "2026-10-08T00:00:00Z" })
  const f = draftFixture({ draft: saved })
  f.render("draft", "")
  const offered = f.render("draft", "")
  assert.equal(offered.hasDraft, true)
  f.flush(); f.leave()
  assert.equal(f.storage.get("draft"), saved)
  assert.equal(offered.getDraftValue(), "<p>작성 중</p>")
  offered.acceptDraft()
  f.render("draft", "<p>작성 중</p>")
  f.flush()
  assert.equal(JSON.parse(f.storage.get("draft")).value, "<p>작성 중</p>")
})

test("draft saves only changed content, flushes on page exit and clear cancels timers", () => {
  const f = draftFixture()
  f.render("draft", "original"); f.flush()
  assert.equal(f.storage.size, 0)
  f.render("draft", "new content"); f.leave()
  assert.equal(JSON.parse(f.storage.get("draft")).value, "new content")
  const draft = f.render("draft", "new content")
  draft.clearDraft(); f.flush(); f.leave()
  assert.equal(f.storage.size, 0)
  f.render("draft", "edited again"); f.flush()
  assert.equal(JSON.parse(f.storage.get("draft")).value, "edited again")
})

test("disabled or changed draft keys cannot overwrite another account's saved content", () => {
  const f = draftFixture()
  f.render("", "", false); f.render("", "typing", false); f.flush()
  assert.equal(f.storage.size, 0)
  f.render("user-one:daily:new", "typing"); f.flush()
  f.render("user-one:daily:new", "pending")
  f.render("user-two:daily:new", "second user"); f.flush()
  assert.equal(JSON.parse(f.storage.get("user-one:daily:new")).value, "typing")
  assert.equal(JSON.parse(f.storage.get("user-two:daily:new")).value, "second user")
})
