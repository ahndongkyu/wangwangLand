import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import { createRequire } from "node:module"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { operatingSnapshot } from "./helpers/operating-fixture.mjs"
const require = createRequire(import.meta.url)
function load(path, mocks = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function("exports", "require", "process", code)(exports, name => {
    if (name in mocks) return mocks[name]
    if (name === "server-only") return {}
    if (name === "../lib/operating-info") return info
    if (name === "@/shared/constants/site") return load("src/shared/constants/site.ts")
    if (["react", "react/jsx-runtime", "node:crypto"].includes(name)) return require(name)
    throw Error(`Missing dependency ${name}`)
  }, { env: {} })
  return exports
}
const info = load("src/features/settings/lib/operating-info.ts")
test("operating settings accept defaults, trim input and reject unsafe or malformed values", () => {
  for (const group of ["delivery", "contact", "account"]) assert.ok(info.validateOperatingInfo(group, info.OPERATING_DEFAULTS[group]))
  const delivery = info.OPERATING_DEFAULTS.delivery
  assert.equal(info.validateOperatingInfo("delivery", { ...delivery, recipient: "  받는이  " }).recipient, "받는이")
  for (const bad of [null, [], {}, { ...delivery, address: " " }, { ...delivery, note: "x".repeat(501) }, { ...delivery, phone: "https://example.com" }, { ...delivery, address: "주소\n변조" }]) assert.equal(info.validateOperatingInfo("delivery", bad), null)
  for (const url of ["javascript:alert(1)", "https://pf.kakao.com.evil.test/a", "https://u:p@pf.kakao.com/a", "https://pf.kakao.com:8080/a"]) assert.equal(info.validateOperatingInfo("contact", { ...info.OPERATING_DEFAULTS.contact, kakaoChannel: url }), null)
  assert.equal(info.validateOperatingInfo("contact", { ...info.OPERATING_DEFAULTS.contact, adoptionPhone: "" }), null)
})
test("public reads whitelist groups and never fall back to old addresses on failure", async () => {
  for (const state of ["missing", "saved", "corrupt", "error", "throw"]) {
    const api = load("src/features/settings/api/operating-queries.ts", {
      react: { cache: fn => fn },
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: table => {
        assert.equal(table, "app_settings")
        return { select() { return this }, in: async (key, keys) => {
          assert.equal(keys.length, 3)
          if (state === "throw") throw Error("offline")
          return { error: state === "error" ? Error("offline") : null, data: state === "missing" ? [] : [{ key: info.OPERATING_KEYS.delivery, value: { data: state === "corrupt" ? {} : { ...info.OPERATING_DEFAULTS.delivery, address: "변경된 배송 주소" }, revision: "new", updatedBy: "private-staff-id" } }] }
        } }
      } }) },
    })
    const result = await api.getOperatingInfo()
    if (["corrupt", "error", "throw"].includes(state)) { assert.equal(result.delivery.data, null); assert.ok(result.delivery.error) }
    else assert.equal(result.delivery.data.address, state === "saved" ? "변경된 배송 주소" : info.OPERATING_DEFAULTS.delivery.address)
    assert.ok(!JSON.stringify(result).includes("private-staff-id"))
  }
})
test("saving requires staff permission, validates first, tracks editor and protects concurrent changes", async () => {
  for (const scenario of ["denied", "invalid", "insert", "update", "conflict", "failure"]) {
    const writes = [], filters = [], refreshes = []
    const api = load("src/features/settings/api/operating-actions.ts", {
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: scenario !== "denied", userId: "staff", error: "권한 없음" }) },
      "next/cache": { revalidatePath: (...args) => refreshes.push(args) },
      "@/features/operation-logs/server": { recordOperationError: async () => {} },
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from() {
        const q = { insert(row) { writes.push(row); return q }, update(row) { writes.push(row); return q }, eq(...args) { filters.push(args); return q }, select: async () => ({ data: scenario === "conflict" ? [] : [{ key: "saved" }], error: scenario === "failure" ? Error("offline") : null }) }; return q
      } }) },
    })
    const result = await api.saveOperatingInfo("delivery", scenario === "invalid" ? {} : info.OPERATING_DEFAULTS.delivery, scenario === "insert" ? null : "previous")
    if (["denied", "invalid"].includes(scenario)) assert.equal(writes.length, 0)
    if (["insert", "update"].includes(scenario)) {
      assert.equal(result.error, undefined); assert.equal(writes[0].value.updatedBy, "staff"); assert.ok(result.revision)
      assert.deepEqual(refreshes, [["/", "layout"]])
    } else { assert.ok(result.error); assert.equal(refreshes.length, 0) }
    if (scenario === "update") assert.ok(filters.some(([key, value]) => key === "value->>revision" && value === "previous"))
  }
})
test("delivery card exposes full address, optional recipient phone and a visible copy action", () => {
  const Card = load("src/features/settings/components/delivery-card.tsx", {
    "@/shared/components/copy-button": { CopyButton: props => React.createElement("button", { "data-copy": props.value }, props.textLabel) },
  }).DeliveryCard
  const html = renderToStaticMarkup(React.createElement(Card, { data: { ...info.OPERATING_DEFAULTS.delivery, phone: "010-1111-2222", note: "택배 전용 주소" } }))
  assert.match(html, /배송 주소 복사/); assert.match(html, /tel:01011112222/)
  assert.match(html, /data-copy="인천 중구 을왕동 206-27 유기견보호소 왕왕랜드"/)
  const failed = renderToStaticMarkup(React.createElement(Card, { data: null }))
  assert.doesNotMatch(failed, /206-27|data-copy/); assert.match(failed, /불러오지 못했습니다/)
})
test("SQL queues staff messages to configured phone while preserving applicant recipients", () => {
  const sql = fs.readFileSync("supabase/migrations/20261026000001_operating_contact_settings.sql", "utf8")
  assert.match(sql, /value->'data'->>'adoptionPhone'/)
  assert.match(sql, /'received',staff_phone/)
  assert.match(sql, /'cancelled-staff',staff_phone/)
  assert.match(sql, /'approved',new.phone/)
  assert.match(sql, /on conflict\(key\) do nothing/)
})

test("manager preserves drafts across tabs, prevents duplicate saves and confirms account changes", async () => {
  const state = [], refs = [], saves = [], messages = []
  let cursor = 0, refCursor = 0
  const Manager = load("src/features/settings/components/operating-manager.tsx", {
    react: { useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => state[i] = typeof next === "function" ? next(state[i]) : next] }, useRef(initial) { return refs[refCursor++] ??= { current: initial } }, useEffect() {} },
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "@/shared/components/toast": { useToast: () => ({ success: text => messages.push(text), error: text => messages.push(text) }) },
    "@/shared/components/ui/button": { Button: "button" }, "./delivery-card": { DeliveryCard: "article" },
    "../api/operating-actions": { saveOperatingInfo: async (group, data, revision) => { saves.push({group, data, revision}); return { data, revision: "saved" } } },
  }).OperatingManager
  const render = () => { cursor = 0; refCursor = 0; return Manager({ initial: operatingSnapshot }) }
  const nodes = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]
  const choose = text => nodes(render()).find(n => n.type === "button" && Array.isArray(n.props.children) && n.props.children[0] === text).props.onClick()
  const edit = (before, after) => nodes(render()).find(n => n.type === "input" && n.props.value === before).props.onChange({ target: { value: after } })
  const submit = () => nodes(render()).find(n => n.type === "form").props.onSubmit({ preventDefault() {} })
  edit("호성이네", "새 수령인")
  choose("연락처·SNS"); choose("배송 안내")
  assert.ok(nodes(render()).some(n => n.props?.value === "새 수령인"))
  submit(); submit(); await new Promise(resolve => setImmediate(resolve))
  assert.equal(saves.length, 1); assert.equal(saves[0].data.recipient, "새 수령인"); assert.ok(messages.length)
  choose("후원 계좌"); edit("NH농협", "변경은행")
  submit(); assert.equal(saves.length, 1)
  assert.ok(nodes(render()).some(n => n.props?.children === "확인 후 저장"))
  submit(); await new Promise(resolve => setImmediate(resolve)); assert.equal(saves.length, 2)
})
