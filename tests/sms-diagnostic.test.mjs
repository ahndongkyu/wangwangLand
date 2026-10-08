import test from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"

const logIds = ["ac874de9-d1c5-499b-8491-6500bdb08dc1", "7d0c0854-9e84-42ed-a461-1672e3e5e4fb"]
const ids = ["M12345678901", "M12345678902"]
function fixture({ authorized = true, configured = true, missing = false, dbError = false, respond } = {}) {
  const calls = [], queries = []
  const exports = {}
  const imports = {
    crypto: { default: crypto },
    "@/shared/lib/auth": { requireTopAdmin: async () => ({ ok: authorized, error: "권한 없음" }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => {
      calls.push("db")
      return { from(table) {
        assert.equal(table, "sms_delivery_logs")
        return {
          select(fields) { assert.equal(fields, "id, provider_message_id"); return this },
          in(field, values) { assert.equal(field, "id"); assert.deepEqual([...values], logIds); return this },
          eq(field, value) { assert.equal(field, "application_id"); assert.equal(value, "8b550f63-8366-464a-bcc8-354218f382ef"); return this },
          limit: async value => { assert.equal(value, 2); return { error: dbError ? {} : null, data: missing ? [] : logIds.map((id, i) => ({ id, provider_message_id: ids[i] })) } },
        }
      } }
    } },
  }
  const code = ts.transpileModule(fs.readFileSync("src/features/sms/diagnose.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, {
    exports, Date, URLSearchParams, AbortSignal,
    process: { env: configured ? { SOLAPI_API_KEY: "private-key", SOLAPI_API_SECRET: "private-secret" } : {} },
    require: name => { assert.ok(name in imports, name); return imports[name] },
    fetch: async (url, options) => {
      const parsed = new URL(url)
      assert.equal(parsed.origin + parsed.pathname, "https://api.solapi.com/messages/v4/list")
      assert.equal(options.method, "GET"); assert.equal(options.cache, "no-store")
      queries.push(parsed.searchParams)
      return respond ? respond(parsed.searchParams) : {
        ok: true, status: 200,
        json: async () => ({ messageList: Object.fromEntries(ids.map(id => [id, { messageId: id, statusCode: "4000", text: "private-body", to: "01012345678", accountId: "private-account" }])) }),
      }
    },
  })
  return { run: exports.diagnoseTestSmsDelivery, calls, queries }
}

test("diagnostic requires top-admin before accessing configuration, DB or provider", async () => {
  const f = fixture({ authorized: false })
  assert.ok((await f.run()).error)
  assert.equal(f.calls.length + f.queries.length, 0)
})

test("missing configuration or fixed test records never queries arbitrary messages", async () => {
  for (const options of [{ configured: false }, { missing: true }, { dbError: true }]) {
    const f = fixture(options)
    assert.ok((await f.run()).error)
    assert.equal(f.queries.length, 0)
  }
})

test("diagnostic makes exactly three read-only calls and does not expose secrets or raw messages", async () => {
  const f = fixture()
  const result = await f.run()
  assert.equal(f.queries.length, 3)
  assert.deepEqual(JSON.parse(f.queries[0].get("messageIds")), ids)
  for (let i = 0; i < 2; i++) {
    assert.equal(f.queries[i + 1].get("criteria"), "messageId")
    assert.equal(f.queries[i + 1].get("cond"), "eq")
    assert.equal(f.queries[i + 1].get("value"), ids[i])
  }
  assert.equal(result.rows[0].matches[0].keyStatus, "4000")
  assert.equal(result.rows[0].matches[0].fieldStatus, "4000")
  const serialized = JSON.stringify(result)
  for (const privateValue of [...ids, ...logIds, "private-key", "private-secret", "private-body", "private-account", "01012345678"]) assert.ok(!serialized.includes(privateValue))
})

test("empty batch and successful single queries remain distinct, without declaring a fix", async () => {
  const f = fixture({ respond: params => ({ ok: true, status: 200, json: async () => ({ messageList: params.has("messageIds") ? {} : { [params.get("value")]: { messageId: params.get("value"), statusCode: 4000 } } }) }) })
  const { rows } = await f.run()
  assert.equal(rows[0].returnedCount, 0)
  assert.equal(rows[0].matches[0].keyStatus, null)
  assert.equal(rows[1].matches[0].keyStatus, "4000")
})

test("array or mismatched object key reveals field matching without leaking content", async () => {
  for (const list of [[{ messageId: ids[0], statusCode: 4000 }], { different: { messageId: ids[0], statusCode: "4000" } }]) {
    const f = fixture({ respond: () => ({ ok: true, status: 200, json: async () => ({ messageList: list }) }) })
    const row = (await f.run()).rows[0]
    assert.equal(row.matches[0].keyMatched, false)
    assert.equal(row.matches[0].fieldMatched, true)
    assert.equal(row.matches[0].fieldStatus, "4000")
  }
})

test("HTTP, invalid JSON, invalid shape and network failures are safe diagnostic results", async () => {
  for (const respond of [
    () => ({ ok: false, status: 401, json: () => { throw Error("Do not read error body") } }),
    () => ({ ok: true, status: 200, json: async () => { throw Error("private-secret") } }),
    () => ({ ok: true, status: 200, json: async () => null }),
    () => { throw Error("private-secret") },
  ]) {
    const f = fixture({ respond })
    const result = await f.run()
    assert.equal(f.queries.length, 3)
    assert.ok(result.rows.every(row => row.error))
    assert.ok(!JSON.stringify(result).includes("private-secret"))
  }
})

test("diagnostic panel starts collapsed with explicit action, not automatic API calls", () => {
  const Panel = load("src/features/sms/diagnostic-panel.tsx", { "./diagnose": { diagnoseTestSmsDelivery: () => { throw Error("Must not auto-run") } } }).SmsDiagnosticPanel
  const html = renderToStaticMarkup(React.createElement(Panel))
  assert.match(html, /<details class=/)
  assert.doesNotMatch(html, /<details[^>]* open/)
  assert.match(html, /테스트 2건 조회 비교/)
  assert.match(html, /aria-live="polite"/)
})
