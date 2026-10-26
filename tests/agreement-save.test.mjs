import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import { load } from "./helpers/page-review-fixtures.mjs"

const versions = { TERMS_VERSION: "2026-04-27", PRIVACY_VERSION: "2026-04-27" }
function setup({ loggedIn = true, outcome = "saved" } = {}) {
  const calls = []
  const exports = {}
  let saved
  const query = {
    update(value) { calls.push("update"); saved = value; return this },
    eq(key, value) { assert.equal(key, "id"); assert.equal(value, "member"); return this },
    select() { return this },
    async maybeSingle() {
      return { data: outcome === "empty" ? null : { id: "member", ...saved, ...(outcome === "mismatch" ? { privacy_version: "old" } : {}) }, error: outcome === "error" ? { code: "42501" } : null }
    },
  }
  const imports = {
    "@/features/legal/versions": versions,
    "next/cache": { revalidatePath: (...args) => calls.push(["revalidate", ...args]) },
    "next/navigation": { redirect: path => { calls.push(["redirect", path]); throw Error("redirect") } },
    "@/shared/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: loggedIn ? { id: "member" } : null } }) }, from: table => { assert.equal(table, "profiles"); return query } }) },
  }
  const source = fs.readFileSync("src/features/members/api/actions.ts", "utf8")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function("exports", "require", code)(exports, name => imports[name] ?? {})
  return { accept: form => exports.acceptAgreements({ error: null }, form), calls, saved: () => saved }
}
function form(overrides = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({ terms_agree: "on", privacy_agree: "on", terms_version: versions.TERMS_VERSION, privacy_version: versions.PRIVACY_VERSION, ...overrides })) if (value !== null) data.set(key, value)
  return data
}
test("agreement versions come from a plain module, not a client component reference", () => {
  const index = fs.readFileSync("src/features/legal/index.ts", "utf8")
  assert.match(index, /export \{ TERMS_VERSION, PRIVACY_VERSION \} from "\.\/versions"/)
  assert.doesNotMatch(fs.readFileSync("src/features/legal/versions.ts", "utf8"), /use client/)
  assert.doesNotMatch(fs.readFileSync("src/features/legal/components/privacy-content.tsx", "utf8"), /export const PRIVACY_VERSION/)
})
test("a member with saved current consent leaves the agreement screen for home", async () => {
  const current = load("src/features/legal/versions.ts")
  assert.equal(typeof current.PRIVACY_VERSION, "string")
  const Page = load("src/app/(public)/agreement/page.tsx", {
    "next/navigation": { redirect: path => { throw Error(`redirect:${path}`) } },
    "@/features/legal": current,
    "@/features/members": { getCurrentProfile: async () => ({ terms_agreed_at: "2026-10-26", privacy_agreed_at: "2026-10-26", terms_version: current.TERMS_VERSION, privacy_version: current.PRIVACY_VERSION }) },
  }).default
  await assert.rejects(Page(), /^Error: redirect:\/$/)
})
test("agreement validation rejects unchecked, missing or stale versions before writes", async () => {
  for (const overrides of [{ terms_agree: null }, { privacy_agree: null }, { terms_version: null }, { privacy_version: "old" }]) {
    const api = setup()
    assert.ok((await api.accept(form(overrides))).error)
    assert.deepEqual(api.calls, [])
  }
  const guest = setup({ loggedIn: false })
  assert.ok((await guest.accept(form())).error)
  assert.deepEqual(guest.calls, [])
})
test("zero-row, failed and mismatched saves do not redirect or invalidate", async () => {
  for (const outcome of ["empty", "error", "mismatch"]) {
    const api = setup({ outcome })
    assert.ok((await api.accept(form())).error)
    assert.deepEqual(api.calls, ["update"])
  }
})
test("verified agreement save refreshes the layout before redirect and respects optional consent", async () => {
  for (const marketing of [null, "on"]) {
    const api = setup()
    await assert.rejects(api.accept(form({ marketing_agree: marketing })), /redirect/)
    assert.deepEqual(api.calls, ["update", ["revalidate", "/", "layout"], ["redirect", "/"]])
    assert.equal(Boolean(api.saved().marketing_agreed_at), marketing === "on")
    assert.equal(api.saved().terms_version, versions.TERMS_VERSION)
    assert.equal(api.saved().privacy_version, versions.PRIVACY_VERSION)
  }
})
