import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import * as jsx from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  vm.runInNewContext(code, { exports, Date, FormData, console: { error() {} }, require(name) {
    assert.ok(name in imports, name)
    return imports[name]
  } })
  return exports
}
const hours = load("src/features/applications/lib/volunteer-operating-hours.ts")
const applicant = load("src/features/applications/lib/volunteer-applicant.ts")
const validation = load("src/shared/lib/validation.ts")
const events = load("src/features/events/types.ts")
const date = load("src/features/events/lib/date.ts")

function harness({ user = true, approved = true, blocked = false, failure = false } = {}) {
  const inserts = [], pushes = []
  const api = load("src/features/applications/api/mutations.ts", {
    "next/cache": { revalidatePath() {} }, "next/navigation": {},
    "@/shared/lib/auth": {},
    "@/shared/lib/supabase/server": { createClient: async () => ({
      auth: { getSession: async () => ({ data: { session: user ? { user: { id: "member" } } : null } }) },
      from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { status: approved ? "approved" : "pending", is_banned: false } }) }),
    }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({
      from(table) {
        if (table === "events") return { select() { return this }, in() { return this }, gte() { return this }, lte: async () => ({ data: blocked ? [{ starts_at: "2099-10-10T01:00:00Z" }] : [] }) }
        assert.equal(table, "volunteer_applications")
        return { insert(value) { inserts.push(value); return this }, select() { return this }, single: async () => ({ data: failure ? null : { id: "application" }, error: failure ? { message: "save failed" } : null }) }
      },
    }) },
    "@/features/push": { sendPushToStaff: async (value) => pushes.push(value) },
    "@/features/events/lib/date": date, "@/features/events/types": events,
    "../lib/volunteer-applicant": applicant, "../lib/volunteer-operating-hours": hours,
    "@/shared/lib/validation": validation,
  })
  return { submit: api.submitVolunteerApplication, inserts, pushes }
}
function form(overrides = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    party_type: "individual", applicant_name: "테스트", phone: "01012345678", party_size: "1",
    available_dates: "2099-10-10", available_time: "17:00", preparation_acknowledged: "on",
    safety_acknowledged: "on", privacy_agreed: "on", terms_agreed: "on", ...overrides,
  })) if (value !== null) data.append(key, value)
  return data
}

test("each required acknowledgement is enforced on the server without writes", async () => {
  for (const field of ["preparation_acknowledged", "safety_acknowledged", "privacy_agreed", "terms_agreed"]) {
    const h = harness()
    assert.equal((await h.submit(form({ [field]: null }))).field, field)
    assert.equal(h.inserts.length, 0)
    assert.equal(h.pushes.length, 0)
  }
})
test("personal submission keeps dates and stores no new activity preferences", async () => {
  const h = harness(), data = form({ activities: "산책" })
  data.append("available_dates", "2099-10-11")
  assert.equal((await h.submit(data)).id, "application")
  assert.equal(h.inserts[0].party_size, 1)
  assert.equal(h.inserts[0].group_name, null)
  assert.equal(h.inserts[0].activities.length, 0)
  assert.equal(h.inserts[0].available_dates.length, 2)
  assert.equal(h.inserts[0].available_time, "17:00")
  assert.equal(h.pushes.length, 1)
  assert.equal("preparation_acknowledged" in h.inserts[0], false, "No new database column required")
})
test("group sizes and optional group names retain existing rules", async () => {
  for (const size of ["2", "30"]) for (const name of ["", "X", "없음", "봉사모임"]) {
    const h = harness()
    assert.equal((await h.submit(form({ party_type: "group", party_size: size, group_name: name }))).id, "application")
    assert.equal(h.inserts[0].group_name, name === "봉사모임" ? name : null)
  }
  for (const size of ["1", "31", "2.5"]) {
    const h = harness()
    assert.equal((await h.submit(form({ party_type: "group", party_size: size }))).field, "party_size")
    assert.equal(h.inserts.length, 0)
  }
})
test("minor guardian, time cutoff and regular-group restrictions are retained", async () => {
  const h = harness({ blocked: true })
  assert.equal((await h.submit(form({ party_type: "group", party_size: "2", has_minor: "on" }))).field, "minor_guardian")
  for (const time of ["11:10", "12:00", "17:10", "17:50"]) assert.equal((await h.submit(form({ available_time: time }))).field, "available_time")
  assert.equal((await h.submit(form({ party_type: "group", party_size: "5" }))).field, "available_dates")
  assert.equal(h.inserts.length, 0)
  assert.equal((await h.submit(form({ party_type: "group", party_size: "2", has_minor: "on", minor_guardian: "on" }))).id, "application")
})
test("unauthenticated/restricted submissions and failed saves do not notify staff", async () => {
  for (const options of [{ user: false }, { approved: false }, { failure: true }]) {
    const h = harness(options)
    assert.ok((await h.submit(form())).error)
    assert.equal(h.pushes.length, 0)
    if (!options.failure) assert.equal(h.inserts.length, 0)
  }
})
test("initial form shows the whole flow and unchecked required preparation, without activity choices", () => {
  const stub = name => props => React.createElement(name, props, props.children)
  const imports = {
    react: React, "react/jsx-runtime": jsx, "../api/mutations": {},
    "../lib/volunteer-operating-hours": hours, "../lib/volunteer-applicant": applicant,
    "./volunteer-time-field": { VolunteerTimeField: () => React.createElement("span", null, "時間") },
    "./volunteer-preparation-guide": load("src/features/applications/components/volunteer-preparation-guide.tsx", { "react/jsx-runtime": jsx }),
    "@/shared/constants/site": { SITE: { sns: { kakaoChannel: "#" } } },
    "@/features/legal": { ConsentSection: () => React.createElement("span", null, "동의") },
    "@/shared/components/date-multi-picker": { DateMultiPicker: () => React.createElement("span", null, "달력") },
    "@/shared/components/phone-input": { PhoneInput: () => React.createElement("input", { name: "phone" }) },
    "@/shared/components/ui/input": { Input: stub("input") }, "@/shared/components/ui/label": { Label: stub("label") },
    "@/shared/components/ui/textarea": { Textarea: stub("textarea") }, "@/shared/lib/validation": validation,
    "@/shared/lib/utils": { cn: (...args) => args.filter(Boolean).join(" ") },
  }
  const { VolunteerForm } = load("src/features/applications/components/volunteer-form.tsx", imports)
  const html = renderToStaticMarkup(React.createElement(VolunteerForm))
  assert.match(html, /언제 방문하시나요/)
  assert.match(html, /방문 전에 확인해 주세요/)
  assert.match(html, /name="preparation_acknowledged"/)
  assert.doesNotMatch(html, /name="activities"|다음<|희망 활동/)
  assert.doesNotMatch(html.match(/<input[^>]*name="preparation_acknowledged"[^>]*>/)[0], /checked/)
  assert.match(html, /쓰레기봉투 후원은 선택/)
})

test("a date selected before raising group size can still be deselected when blocked", () => {
  const state = []
  let cursor = 0, selection
  const { DateMultiPicker } = load("src/shared/components/date-multi-picker.tsx", {
    "react/jsx-runtime": jsx,
    react: {
      useMemo: (fn) => fn(),
      useState(initial) {
        const index = cursor++
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial
        return [state[index], value => { state[index] = value }]
      },
    },
    "lucide-react": { ChevronLeft: () => null, ChevronRight: () => null },
    "@/shared/lib/utils": { cn: (...args) => args.filter(Boolean).join(" ") },
  })
  const today = hours.volunteerToday()
  function nodes(node) {
    if (!node || typeof node !== "object") return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children)]
  }
  function render() {
    cursor = 0
    return DateMultiPicker({ name: "dates", defaultValue: [today], disabledDates: [today], onChange: dates => { selection = dates } })
  }
  let day = nodes(render()).find(node => node.type === "button" && node.props["aria-label"]?.startsWith(today))
  assert.equal(day.props.disabled, false)
  day.props.onClick()
  assert.equal(selection.length, 0)
  day = nodes(render()).find(node => node.type === "button" && node.props["aria-label"]?.startsWith(today))
  assert.equal(day.props.disabled, true)
})
