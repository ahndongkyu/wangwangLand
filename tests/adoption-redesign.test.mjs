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
  vm.runInNewContext(code, { exports, FormData, Date, console: { error() {} }, require(name) {
    if (name === "../lib/volunteer-sms") return load("src/features/applications/lib/volunteer-sms.ts")
    assert.ok(name in imports, name)
    return imports[name]
  } })
  return exports
}
const validation = load("src/shared/lib/validation.ts")
function harness({ user = true, approved = true, banned = false, animalStatus = "보호중", missing = false, failure = false } = {}) {
  const inserts = [], pushes = [], lookups = []
  const client = {
    auth: { getUser: async () => ({ data: { user: user ? { id: "member", email: "test@example.invalid" } : null } }) },
    from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { status: approved ? "approved" : "pending", is_banned: banned } }) }),
  }
  const api = load("src/features/applications/api/mutations.ts", {
    "next/cache": {}, "next/navigation": {}, "@/shared/lib/auth": {},
    "@/shared/lib/supabase/server": { createClient: async () => client },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from(table) {
      if (["dogs", "cats"].includes(table)) return { select() { return this }, eq(key, id) { lookups.push({ table, id }); return this }, maybeSingle: async () => ({ data: missing ? null : { status: animalStatus } }) }
      assert.equal(table, "adoption_applications")
      return { insert(value) { inserts.push(value); return this }, select() { return this }, single: async () => ({ data: failure ? null : { id: "application" }, error: failure ? { message: "save failed" } : null }) }
    } }) },
    "@/features/events/lib/date": {}, "@/features/events/types": {},
    "../lib/volunteer-applicant": {}, "../lib/volunteer-operating-hours": {},
    "@/shared/lib/validation": validation,
    "@/features/push": { sendPushToStaff: async v => pushes.push(v) },
  })
  return { submit: api.submitAdoptionApplication, inserts, pushes, lookups }
}
function form(overrides = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    animal_mode: "consult", applicant_name: "테스트", phone: "01012345678", address: "인천광역시 중구",
    reason: "아이와 평생 가족으로 함께하고 싶습니다.", current_pets: "없음", past_pet_experience: "없음",
    family_size: "2", has_children: "false", housing_type: "아파트", ownership_type: "자가",
    visit_available_dates: "2099-10-10", visit_available_time: "17:50",
    adult: "on", family_consent: "on", readiness: "on", privacy_agreed: "on", terms_agreed: "on", ...overrides,
  })) if (value !== null) data.append(key, value)
  return data
}
test("adoption selection links dogs and cats independently", async () => {
  for (const kind of ["dog", "cat"]) {
    const h = harness()
    assert.equal((await h.submit(form({ animal_mode: "select", [`${kind}_id`]: "animal" }))).id, "application")
    assert.equal(h.inserts[0][`${kind}_id`], "animal")
    assert.equal(h.lookups[0].table, `${kind}s`)
    assert.equal(h.inserts[0].preferred_animal, null)
    assert.equal(h.pushes.length, 1)
  }
})
test("manual preference saves separately without auto-linking; consultation clears stale values", async () => {
  for (const mode of ["manual", "consult"]) {
    const h = harness()
    assert.ok((await h.submit(form({ animal_mode: mode, dog_id: "stale", cat_id: "stale", preferred_animal: "  흰색 작은 아이  " }))).id)
    assert.equal(h.inserts[0].dog_id, null)
    assert.equal(h.inserts[0].cat_id, null)
    assert.equal(h.inserts[0].preferred_animal, mode === "manual" ? "흰색 작은 아이" : null)
    assert.equal(h.inserts[0].reason, "아이와 평생 가족으로 함께하고 싶습니다.")
    assert.equal(h.lookups.length, 0)
  }
})
test("invalid and unavailable animal selections never save", async () => {
  for (const input of [{ animal_mode: "" }, { animal_mode: "select" }, { animal_mode: "select", dog_id: "a", cat_id: "b" }, { animal_mode: "manual", preferred_animal: " " }, { animal_mode: "manual", preferred_animal: "가".repeat(301) }]) {
    const h = harness()
    assert.ok((await h.submit(form(input))).error)
    assert.equal(h.inserts.length, 0)
  }
  for (const options of [{ animalStatus: "입양완료" }, { animalStatus: "무지개다리" }, { missing: true }]) {
    const h = harness(options)
    assert.ok((await h.submit(form({ animal_mode: "select", dog_id: "a" }))).error)
    assert.equal(h.inserts.length, 0)
  }
})
test("trimmed adoption reason minimum is 10 characters", async () => {
  for (const reason of ["", "          ", "123456789", " 123456789 "]) {
    const h = harness()
    assert.equal((await h.submit(form({ reason }))).field, "reason")
    assert.equal(h.inserts.length, 0)
  }
  const h = harness()
  assert.ok((await h.submit(form({ reason: " 1234567890 " }))).id)
  assert.equal(h.inserts[0].reason, "1234567890")
})
test("adoption checks enforced on server including conditional landlord consent", async () => {
  for (const field of ["adult", "family_consent", "readiness", "privacy_agreed", "terms_agreed"]) {
    const h = harness()
    assert.ok((await h.submit(form({ [field]: null }))).error)
    assert.equal(h.inserts.length, 0)
  }
  for (const ownership_type of ["전세", "월세"]) {
    const h = harness()
    assert.equal((await h.submit(form({ ownership_type }))).field, "landlord_consent")
    assert.ok((await h.submit(form({ ownership_type, landlord_consent: "on" }))).id)
  }
})
test("adoption times preserve existing 17:50 option and reject invalid hours/minutes", async () => {
  const h = harness()
  assert.ok((await h.submit(form())).id)
  for (const time of ["12:00", "18:00", "17:59", "99:99", ""]) assert.ok((await h.submit(form({ visit_available_time: time }))).error)
  assert.equal(h.inserts.length, 1)
})
test("unauthenticated, unapproved, banned and failed saves do not send notifications", async () => {
  for (const options of [{ user: false }, { approved: false }, { banned: true }, { failure: true }]) {
    const h = harness(options)
    assert.ok((await h.submit(form())).error)
    assert.equal(h.pushes.length, 0)
    if (!options.failure) assert.equal(h.inserts.length, 0)
  }
})
test("form renders one page with required reason and explicit unchecked qualifications", () => {
  const stub = tag => function Stub(props) { return React.createElement(tag, props, props.children) }
  const { AdoptionForm } = load("src/features/applications/components/adoption-form.tsx", {
    react: React, "react/jsx-runtime": jsx, "next/image": { default: () => null }, "next/link": { default: stub("a") },
    "@/shared/components/toast": { useToast: () => ({ success() {}, error() {} }) },
    "../api/mutations": {}, "../api/adoption-animals": {}, "@/features/legal": { ConsentSection: () => null },
    "@/shared/components/address-search-input": { AddressSearchInput: () => null },
    "@/shared/components/date-multi-picker": { DateMultiPicker: () => null },
    "@/shared/components/phone-input": { PhoneInput: () => null },
    "@/shared/components/ui/input": { Input: stub("input") }, "@/shared/components/ui/label": { Label: stub("label") },
    "@/shared/components/ui/textarea": { Textarea: stub("textarea") }, "@/shared/lib/validation": validation,
  })
  const html = renderToStaticMarkup(React.createElement(AdoptionForm))
  assert.match(html, /함께하고 싶은 아이/)
  assert.match(html, /상담 후 결정/)
  assert.match(html, /희망 방문 일정/)
  assert.match(html, /<textarea[^>]*name="reason"[^>]*required=""[^>]*minLength="10"/)
  assert.doesNotMatch(html, /다음<|stepLabels|오피스텔텔/)
  for (const name of ["adult", "family_consent", "readiness"]) {
    const input = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))[0]
    assert.match(input, /required/)
    assert.doesNotMatch(input, /checked/)
  }
  const linked = renderToStaticMarkup(React.createElement(AdoptionForm, { initialAnimal: { id: "cat", name: "나비", kind: "cat", image: null } }))
  assert.match(linked, /name="cat_id" value="cat"/)
  assert.match(linked, /나비/)
  assert.match(linked, /다른 아이 선택/)
})
