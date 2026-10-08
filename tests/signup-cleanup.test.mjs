import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function fixture({ authFailure = false, profileFailure = false, secret = "test", queryFailure = false } = {}) {
  const calls = []
  const exports = {}
  const imports = {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({
      auth: { admin: { deleteUser: async () => { calls.push("auth"); return { error: authFailure ? { message: "auth failed" } : null } } } },
      from() { return {
        select() { return this }, is() { return this },
        lt: async () => ({ data: [{ id: "test-user", nickname: "test" }], error: queryFailure ? { message: "offline" } : null }),
        delete() { calls.push("profile"); return this }, eq: async () => ({ error: profileFailure ? { message: "profile failed" } : null }),
      } },
    }) },
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/app/api/cron/cleanup-incomplete-signups/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, process: { env: { CRON_SECRET: secret } }, require: name => imports[name],
  })
  return { calls, run: () => exports.GET(new Request("http://localhost/cron", { headers: { authorization: "Bearer test" } })) }
}

test("cleanup counts returned errors as failures and preserves profiles on auth deletion failure", async () => {
  for (const authFailure of [true, false]) for (const profileFailure of [true, false]) {
    const f = fixture({ authFailure, profileFailure })
    const { body } = await f.run()
    assert.equal(body.deleted, authFailure || profileFailure ? 0 : 1)
    assert.equal(body.failed, authFailure || profileFailure ? 1 : 0)
    assert.equal(body.ok, !authFailure && !profileFailure)
    assert.deepEqual(f.calls, authFailure ? ["auth"] : ["auth", "profile"])
  }
})

test("cleanup never deletes on missing secret or target lookup error", async () => {
  for (const options of [{ secret: "" }, { queryFailure: true }]) {
    const f = fixture(options)
    assert.ok((await f.run()).status >= 400)
    assert.equal(f.calls.length, 0)
  }
})
