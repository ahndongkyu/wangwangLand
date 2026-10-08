import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import crypto from "node:crypto"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"

function fixture({ authorized = true, configured = true, logFails = false, response, networkError = false } = {}) {
  const calls = []
  const exports = {}
  const imports = {
    "server-only": {}, crypto: { default: crypto },
    "@/shared/lib/auth": { requireAdmin: async () => ({ ok: authorized, userId: "staff", error: "권한 없음" }) },
    "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from(table) {
      assert.equal(table, "sms_delivery_logs")
      return {
        insert(value) { calls.push(["insert", value]); return this },
        select() { return this },
        single: async () => ({ data: logFails ? null : { id: "log" }, error: logFails ? {} : null }),
        update(value) { calls.push(["update", value]); return this },
        eq: async () => ({ error: null }),
      }
    } }) },
  }
  const source = ts.transpileModule(fs.readFileSync("src/features/sms/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, {
    exports, Date, URLSearchParams, AbortSignal, console,
    process: { env: configured ? { SOLAPI_API_KEY: "test", SOLAPI_API_SECRET: "test", SOLAPI_SENDER_NUMBER: "01000000000" } : {} },
    require: name => { assert.ok(name in imports, name); return imports[name] },
    fetch: async (url, options) => {
      calls.push(["fetch", url, options])
      if (networkError) throw Error("Network interrupted")
      return response ?? { ok: true, json: async () => ({ messageList: [{ messageId: "provider-id", statusCode: "2000" }] }) }
    },
  })
  return { api: exports, calls }
}

test("SMS never sends without permission or a persisted request record", async () => {
  for (const options of [{ authorized: false }, { logFails: true }, { configured: false }]) {
    const { api, calls } = fixture(options)
    assert.equal((await api.sendSms("010-0000-0000", "본문")).ok, false)
    assert.equal(calls.some(([kind]) => kind === "fetch"), false)
  }
})

test("SMS sends once and records provider ID, not delivery success", async () => {
  const { api, calls } = fixture()
  assert.equal((await api.sendSms("010-0000-0000", "본문", { applicationId: "app", applicationType: "volunteer", recipientName: "신청자" })).ok, true)
  assert.equal(calls[0][0], "insert")
  assert.equal(calls[0][1].application_id, "app")
  const requests = calls.filter(([kind]) => kind === "fetch")
  assert.equal(requests.length, 1)
  assert.equal(JSON.parse(requests[0][2].body).messages[0].to, "01000000000")
  assert.equal(calls.at(-1)[1].state, "accepted")
  assert.equal(calls.at(-1)[1].provider_message_id, "provider-id")
})

test("SMS distinguishes rejected and ambiguous requests without retries", async () => {
  for (const [options, state] of [
    [{ networkError: true }, "unknown"],
    [{ response: { ok: false, status: 403 } }, "failed"],
    [{ response: { ok: true, json: async () => ({ failedMessageList: [{ statusMessage: "발신번호 미등록" }] }) } }, "failed"],
    [{ response: { ok: true, json: async () => ({}) } }, "unknown"],
  ]) {
    const { api, calls } = fixture(options)
    assert.equal((await api.sendSms("01000000000", "본문")).ok, false)
    assert.equal(calls.at(-1)[1].state, state)
    assert.equal(calls.filter(([kind]) => kind === "fetch").length, 1)
  }
})

test("provider result lookup requires staff and does not write or send", async () => {
  const denied = fixture({ authorized: false })
  assert.ok((await denied.api.getSmsDeliveryReports(["message"])).error)
  assert.equal(denied.calls.length, 0)
  const allowed = fixture({ response: { ok: true, json: async () => ({ messageList: { message: { statusCode: "4000" } } }) } })
  assert.equal((await allowed.api.getSmsDeliveryReports(["message"])).reports.message.statusCode, "4000")
  assert.equal(allowed.calls.length, 1)
  assert.match(allowed.calls[0][1], /messages\/v4\/list/)
})

test("approval template uses confirmed KST visits and the approved copy", () => {
  const { buildVolunteerSms } = load("src/features/applications/lib/volunteer-sms.ts")
  const message = buildVolunteerSms("confirmed", "홍길동", ["2026-10-18T04:00:00Z"], 3)
  assert.equal(message.type, "LMS")
  assert.match(message.text, /2026\.10\.18\(일\) 13:00/)
  assert.match(message.text, /참여 인원: 3명/)
  assert.match(message.text, /마이페이지에서 요청하실 수 있습니다/)
  assert.match(message.text, /https:\/\/wangwangland.kr\/my\/applications$/)
  assert.throws(() => buildVolunteerSms("confirmed", "신청자", [], 1))
})

test("SMS history renders delivery status, content, application link and distinct query errors", async () => {
  for (const failed of [false, true]) {
    const page = load("src/app/(admin)/admin/(protected)/sms/page.tsx", {
      "@/features/sms/auto-refresh": { SmsAutoRefresh: () => null },
      "@/features/sms/diagnostic-panel": { SmsDiagnosticPanel: () => null },
      "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true }) },
      "@/shared/lib/utils": { formatPostDateTime: value => value },
      "@/features/sms": { getSmsDeliveryReports: async () => ({ reports: { message: { statusCode: "4000", reason: "정상 처리" } } }) },
      "@/shared/lib/supabase/admin": { createAdminClient: () => ({ from() {
        return { select() { return this }, order() { return this }, range: async () => ({ error: failed ? {} : null, count: failed ? 0 : 21,
          data: failed ? null : [{ id: "log", created_at: "2026-10-08", recipient_name: "신청자", recipient_phone: "01000000000", message: "문자 본문", state: "accepted", provider_message_id: "message", application_type: "volunteer", application_id: "app" }],
        }) }
      } }) },
    }).default
    const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }))
    if (failed) {
      assert.match(html, /role="alert"/)
      assert.doesNotMatch(html, /기록된 문자 발송 내역이 없습니다/)
    } else {
      assert.match(html, /전달 완료/)
      assert.match(html, /<details/)
      assert.match(html, /문자 본문/)
      assert.match(html, /\/admin\/applications\/volunteer\/app/)
      assert.match(html, /\/admin\/sms\?page=2/)
      assert.match(html, /name="sms-history"/)
      assert.doesNotMatch(html, /<details[^>]*\sopen(?:=""|\s|>)/)
      assert.match(html, /<span>수신자<\/span><span>전화번호<\/span><span>발송 일시<\/span><span>발송 상태<\/span>/)
      const summary = html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1]
      const labels = ["수신자 ", "전화번호 ", "발송 일시 ", "발송 상태 ", "펼치기"]
      const positions = labels.map(label => summary.indexOf(label))
      assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])))
      assert.match(summary, /group-open:hidden/)
      assert.match(summary, /group-open:inline/)
    }
  }
})
