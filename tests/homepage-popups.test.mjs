import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import { randomUUID } from "node:crypto"
import * as jsxRuntime from "react/jsx-runtime"

function load(file, imports = {}, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, URL, Date, console, crypto: { randomUUID }, ...globals, require(name) { assert.ok(name in imports, name); return imports[name] } })
  return exports
}
const model = load("src/features/settings/lib/popups.ts")
const fixture = (patch = {}) => ({
  id: "00000000-0000-4000-8000-000000000001", revision: "00000000-0000-4000-8000-000000000002",
  title: "행사 안내", body: "봉사 신청 전 확인해 주세요.", image: "", imageAlt: "",
  linkUrl: "/volunteer", linkLabel: "봉사 신청",
  startsAt: "2026-10-10T00:00:00.000Z", endsAt: "2026-10-17T09:00:00.000Z",
  enabled: true, placements: ["home"], ...patch,
})
test("popup validation accepts a complete notice and requires fields", () => {
  assert.equal(model.popupValidation(fixture()), null)
  for (const patch of [{ title: " " }, { body: "" }, { title: "a".repeat(91) }, { body: "a".repeat(5001) }, { enabled: "true" }, { placements: [] }, { placements: ["home", "home"] }, { placements: ["admin"] }, { id: "site_photos" }, { revision: "" }, { linkLabel: "" }]) assert.ok(model.popupValidation(fixture(patch)), JSON.stringify(patch))
  for (const value of [null, {}, false, "bad"]) assert.ok(model.popupValidation(value))
})
test("links reject script, protocol-relative, credentials and control characters", () => {
  for (const link of ["", "/volunteer", "/notices/id?from=popup", "https://wangwangland.kr/notices/id"]) assert.equal(model.safePopupLink(link), true, link)
  for (const link of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "/\nevil.example", "http://example.com", "https://name:password@example.com"]) assert.equal(model.safePopupLink(link), false, link)
})
test("images require managed uploads and alternative text", () => {
  const image = "https://example.public.blob.vercel-storage.com/site-photos/poster.png"
  assert.equal(model.popupValidation(fixture({ image, imageAlt: "행사 일정" })), null)
  assert.ok(model.popupValidation(fixture({ image })))
  for (const value of ["https://example.com/a.png", "https://example.public.blob.vercel-storage.com/other/a.png", "data:image/png,abc"]) assert.equal(model.validPopupImage(value), false)
})
test("schedule is start-inclusive and end-exclusive; private/future never leak", () => {
  const p = fixture()
  assert.equal(model.activePopups([p], "home", Date.parse(p.startsAt) - 1).length, 0)
  assert.equal(model.activePopups([p], "home", Date.parse(p.startsAt)).length, 1)
  assert.equal(model.activePopups([p], "home", Date.parse(p.endsAt)).length, 0)
  assert.equal(model.activePopups([p], "volunteer", Date.parse(p.startsAt)).length, 0)
  assert.equal(model.activePopups([fixture({ enabled: false })], "home", Date.parse(p.startsAt)).length, 0)
  assert.equal(model.activePopups([null, {}], "home").length, 0)
})
test("invalid or reversed dates cannot be saved", () => {
  for (const patch of [{ startsAt: "" }, { startsAt: "2026-02-30T00:00:00.000Z" }, { endsAt: "2026-10-10T00:00:00.000Z" }, { endsAt: "2025-01-01T00:00:00.000Z" }, { endsAt: "2026-10-17T18:00" }]) assert.ok(model.popupValidation(fixture(patch)))
})
test("Korean input is independent of browser time zone and rejects invalid days", () => {
  assert.equal(model.fromKoreanInput("2026-10-17T18:00"), "2026-10-17T09:00:00.000Z")
  assert.equal(model.toKoreanInput("2026-10-17T09:00:00.000Z"), "2026-10-17T18:00")
  assert.equal(model.fromKoreanInput("2026-02-30T12:00"), "")
  assert.equal(model.fromKoreanInput(""), "")
})
test("hide today ends at Korean midnight, including year rollover", () => {
  assert.equal(new Date(model.nextKoreanMidnight(Date.parse("2026-10-17T14:59:59Z"))).toISOString(), "2026-10-17T15:00:00.000Z")
  assert.equal(new Date(model.nextKoreanMidnight(Date.parse("2026-10-17T15:00:00Z"))).toISOString(), "2026-10-18T15:00:00.000Z")
  assert.equal(new Date(model.nextKoreanMidnight(Date.parse("2026-12-31T14:00:00Z"))).toISOString(), "2026-12-31T15:00:00.000Z")
  assert.notEqual(model.popupStorageKey("one"), model.popupStorageKey("two"))
})
function actions(auth, db, refreshed = []) {
  return load("src/features/settings/api/popup-actions.ts", {
    "next/cache": { revalidatePath: p => refreshed.push(p) },
    "@/shared/lib/auth": { requireAdmin: async () => auth },
    "@/shared/lib/supabase/admin": { createAdminClient: () => db },
    "../lib/popups": model,
  })
}
test("unauthenticated mutations are rejected before database access", async () => {
  const api = actions({ ok: false, error: "denied" }, null)
  assert.equal((await api.saveHomepagePopup(fixture(), null)).error, "denied")
  assert.equal((await api.deleteHomepagePopup(fixture().id, fixture().revision)).error, "denied")
})
test("invalid inputs cannot reach the database", async () => {
  const api = actions({ ok: true }, null)
  assert.ok((await api.saveHomepagePopup(fixture({ title: "" }), null)).error)
  assert.ok((await api.saveHomepagePopup(fixture(), "bad")).error)
  assert.ok((await api.deleteHomepagePopup("site_photos", fixture().revision)).error)
})
function fakeDb(result) {
  const calls = []
  const chain = {
    insert(value) { calls.push(["insert", value]); return this },
    update(value) { calls.push(["update", value]); return this },
    delete() { calls.push(["delete"]); return this },
    eq(...args) { calls.push(["eq", ...args]); return this },
    select: async () => result,
  }
  return { calls, from(name) { assert.equal(name, "app_settings"); return chain } }
}
test("new popup inserts a single isolated key and server-generated revision", async () => {
  const db = fakeDb({ data: [{}], error: null }), refreshed = []
  const result = await actions({ ok: true }, db, refreshed).saveHomepagePopup(fixture({ title: " 행사 안내 ", unexpected: "ignored" }), null)
  assert.equal(result.popup.title, "행사 안내")
  assert.notEqual(result.popup.revision, fixture().revision)
  assert.equal(result.popup.unexpected, undefined)
  assert.equal(db.calls[0][1].key, model.POPUP_KEY_PREFIX + fixture().id)
  assert.deepEqual(refreshed, ["/admin/settings"])
})
test("updates and deletes compare revisions to prevent concurrent overwrites", async () => {
  for (const success of [true, false]) {
    const db = fakeDb({ data: success ? [{}] : [], error: null })
    const api = actions({ ok: true }, db)
    const result = await api.saveHomepagePopup(fixture(), fixture().revision)
    assert.equal(Boolean(result.popup), success)
    assert.ok(db.calls.some(call => call[0] === "eq" && call[1] === "value->>revision" && call[2] === fixture().revision))
    const deleted = await api.deleteHomepagePopup(fixture().id, fixture().revision)
    assert.equal(Boolean(deleted.ok), success)
  }
})
test("database failure is never reported as a save or delete success", async () => {
  const api = actions({ ok: true }, fakeDb({ error: { message: "failure" } }))
  assert.ok((await api.saveHomepagePopup(fixture(), null)).error)
  assert.ok((await api.deleteHomepagePopup(fixture().id, fixture().revision)).error)
})
test("public endpoint validates location, disables caching, and handles failure", async () => {
  for (const fail of [false, true]) {
    let calls = 0
    const api = load("src/app/api/homepage-popups/route.ts", {
      "@/features/settings/api/popup-queries": { getActivePopups: async placement => { calls++; assert.equal(placement, "home"); if (fail) throw new Error(); return [fixture()] } },
    }, { Response })
    assert.equal((await api.GET(new Request("https://example.com/api?placement=admin"))).status, 400)
    assert.equal(calls, 0)
    const response = await api.GET(new Request("https://example.com/api?placement=home"))
    assert.equal(response.status, fail ? 503 : 200)
    assert.equal(response.headers.get("cache-control"), "no-store")
  }
})

test("public query returns only currently enabled notices and admin read checks role", async () => {
  let reads = 0
  const active = fixture({ startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 60000).toISOString() })
  const rows = [active, fixture({ enabled: false }), fixture({ startsAt: "2099-01-01T00:00:00.000Z", endsAt: "2099-01-02T00:00:00.000Z" })].map(p => ({ key: model.POPUP_KEY_PREFIX + p.id, value: p }))
  const chain = { select() { return this }, like() { return this }, order() { return this }, range: async () => { reads++; return { data: rows } } }
  const queries = load("src/features/settings/api/popup-queries.ts", {
    "server-only": {}, "@/shared/lib/auth": { requireAdmin: async () => ({ ok: false, error: "denied" }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: () => chain }) }, "../lib/popups": model,
  })
  assert.equal((await queries.getAdminPopups()).error, "denied")
  assert.equal(reads, 0)
  assert.equal((await queries.getActivePopups("home")).length, 1)
})

function editorHarness(saveResult) {
  const state = []; let cursor = 0, writes = 0
  const component = load("src/features/settings/components/popup-manager.tsx", {
    "react/jsx-runtime": jsxRuntime,
    react: { useRef() { return { current: null } }, useEffect() {}, useState(initial) { const slot = cursor++; if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial; return [state[slot], value => { state[slot] = typeof value === "function" ? value(state[slot]) : value }] } },
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "@/shared/components/toast": { useToast: () => ({ success() {}, error() {} }) },
    "@/shared/components/ui/button": { Button: "button" }, "@/shared/components/confirm-dialog": { useConfirm: () => async () => ({ ok: true }) },
    "../api/popup-actions": { saveHomepagePopup: async () => { writes++; return saveResult }, deleteHomepagePopup: async () => ({ ok: true }) },
    "../lib/popups": model, "./homepage-popup": { PopupContent: "preview", PopupDialog: "dialog" },
  })
  const render = () => { cursor = 0; return component.PopupManager({ initialPopups: [fixture()], loadError: null }) }
  const nodes = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
  const text = node => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : ""
  return { render, nodes, text, writes: () => writes, button: (tree, name) => nodes(tree).find(n => n.type === "button" && text(n) === name) }
}
test("admin live preview follows unsaved input without database writes", async () => {
  const h = editorHarness({ error: "failed" }); let tree = h.render()
  await h.button(tree, "수정").props.onClick(); tree = h.render()
  h.nodes(tree).find(n => n.type === "input" && n.props.maxLength === 90).props.onChange({ target: { value: "변경한 제목" } }); tree = h.render()
  assert.equal(h.nodes(tree).find(n => n.type === "preview").props.popup.title, "변경한 제목")
  h.button(tree, "실제 크기로 보기").props.onClick(); tree = h.render()
  assert.equal(h.nodes(tree).find(n => n.type === "dialog").props.open, true)
  assert.equal(h.writes(), 0)
})
test("failed save retains edits and only successful save reports completion", async () => {
  for (const ok of [false, true]) {
    const h = editorHarness(ok ? { popup: fixture({ title: "변경한 제목" }) } : { error: "저장 실패" }); let tree = h.render()
    await h.button(tree, "수정").props.onClick(); tree = h.render()
    h.nodes(tree).find(n => n.type === "input" && n.props.maxLength === 90).props.onChange({ target: { value: "변경한 제목" } }); tree = h.render()
    await h.button(tree, "팝업 설정 저장").props.onClick(); tree = h.render()
    assert.equal(h.writes(), 1)
    assert.match(h.text(tree), ok ? /저장 완료/ : /저장 실패/)
    const title = h.nodes(tree).find(n => n.type === "input" && n.props.maxLength === 90)
    if (ok) {
      assert.equal(title, undefined)
      assert.equal(h.button(tree, "팝업 설정 저장"), undefined)
      assert.match(h.text(tree), /변경한 제목/)
      await h.button(tree, "새 팝업").props.onClick(); tree = h.render()
      assert.equal(h.nodes(tree).find(n => n.type === "input" && n.props.maxLength === 90).props.value, "")
    } else {
      assert.equal(title.props.value, "변경한 제목")
      assert.equal(h.button(tree, "팝업 설정 저장").props.disabled, false)
    }
  }
})
