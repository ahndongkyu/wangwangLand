import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import sanitizeHtml from "sanitize-html"

function load(file, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  new Function("exports", "require", code)(exports, name => {
    if (name === "server-only") return {}
    assert.ok(name in imports, `Missing ${name}`)
    return imports[name]
  })
  return exports
}

test("verified auth rejects guests, pending, rejected and banned staff; only admin can manage members", async () => {
  for (const role of [null, "member", "staff", "admin"]) for (const status of ["pending", "approved", "rejected"]) for (const is_banned of [false, true]) {
    const api = load("src/shared/lib/auth.ts", { "@/shared/lib/supabase/server": { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: role ? { id: "actor" } : null } }) },
      from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: { role, status, is_banned } }) }),
    }) } })
    const active = Boolean(role && status === "approved" && !is_banned)
    assert.equal(Boolean(await api.getActiveMember()), active)
    assert.equal((await api.requireAdmin()).ok, active && ["staff", "admin"].includes(role))
    assert.equal((await api.requireTopAdmin()).ok, active && role === "admin")
  }
})

test("member management actions reject unauthorized requests before creating privileged clients", async () => {
  let writes = 0
  const api = load("src/features/members/api/actions.ts", {
    "next/headers": {}, "next/cache": {}, "next/navigation": {}, "@vercel/blob": {},
    "../lib/login-return": {}, "@/shared/lib/member-role": {}, "@/shared/lib/validation": {}, "@/shared/constants/home-navigation": {},
    "@/shared/lib/auth": { requireTopAdmin: async () => ({ ok: false, error: "denied" }) },
    "@/shared/lib/supabase/server": { createClient: () => { writes++; throw Error("unexpected") } },
    "@/shared/lib/supabase/service": { createServiceClient: () => { writes++; throw Error("unexpected") } },
  })
  for (const [name, value] of [["rejectMember"], ["updateMemberStatus", "approved"], ["toggleMemberBan", true], ["approveMember", "admin"], ["updateMemberRole", "admin"]]) {
    assert.equal((await api[name]("victim", value)).error, "denied")
  }
  assert.equal(writes, 0)
})

test("rich text removes executable HTML while retaining editor text, images and formatting", () => {
  const { sanitizeRichText } = load("src/shared/lib/sanitize-rich-text.ts", { "sanitize-html": sanitizeHtml })
  const result = sanitizeRichText('<p style="text-align:center;font-size:18px;position:fixed">안내<strong>강조</strong></p><img src="https://example.test/dog.jpg" onerror="alert(1)"><script>alert(2)</script><svg onload="alert(3)"></svg><a href="javascript:alert(4)" target="_blank">링크</a><iframe src="https://evil.test"></iframe>')
  assert.match(result, /안내<strong>강조<\/strong>/)
  assert.match(result, /text-align:center;font-size:18px/)
  assert.match(result, /https:\/\/example.test\/dog.jpg/)
  assert.match(result, /noopener noreferrer/)
  assert.doesNotMatch(result, /onerror|onload|javascript:|<script|<svg|<iframe|position:|alert\(/)
  assert.doesNotMatch(sanitizeRichText('<img src="data:image/svg+xml,evil"><a href="jav&#x61;script:alert(1)">x</a>'), /src=|href=/)
})

test("privacy audit stores identifiers only and fails closed on persistence failure", async () => {
  for (const failed of [false, true]) {
    let saved
    let errors = 0
    const api = load("src/shared/lib/privacy-audit.ts", {
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from: table => { assert.equal(table, "privacy_access_logs"); return { insert: async row => { saved = row; return { error: failed ? { code: "XX000" } : null } } } } }) },
      "@/features/operation-logs/server": { recordOperationError: async () => { errors++ } },
    })
    const call = api.recordPrivacyAccess("actor", "adoption_document", "target", "download")
    if (failed) await assert.rejects(call, /접근 기록/)
    else await call
    assert.deepEqual(saved, { actor_id: "actor", resource: "adoption_document", target_id: "target", action: "download" })
    assert.equal(errors, Number(failed))
  }
})
