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
    "@/features/operation-logs/server": { recordOperationError: async () => {} },
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
      return typeof response === "function" ? response(url, options) : response ?? { ok: true, json: async () => ({ messageList: [{ messageId: "provider-id", statusCode: "2000" }] }) }
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

test("empty batch falls back to exact-ID reads and resolves delivery without writes", async () => {
  const { api, calls } = fixture({ response: async (url, options) => {
    const params = new URL(url).searchParams
    assert.equal(options.cache, "no-store")
    if (params.has("messageIds")) return { ok: true, json: async () => ({ messageList: {} }) }
    assert.equal(options.method, "GET")
    assert.equal(params.get("criteria"), "messageId")
    assert.equal(params.get("cond"), "eq")
    assert.equal(params.get("limit"), "1")
    const id = params.get("value")
    return { ok: true, json: async () => ({ messageList: { [id]: { messageId: id, statusCode: 4000 } } }) }
  } })
  const result = await api.getSmsDeliveryReports(["one", "two", "one"])
  assert.equal(result.error, undefined)
  assert.equal(result.reports.one.statusCode, "4000")
  assert.equal(result.reports.two.statusCode, "4000")
  assert.equal(calls.length, 3)
  assert.ok(calls.every(([kind]) => kind === "fetch"))
})

test("only missing results are queried and partial failures preserve known delivery", async () => {
  const { api, calls } = fixture({ response: async url => {
    const params = new URL(url).searchParams
    if (params.has("messageIds")) return { ok: true, json: async () => ({ messageList: { one: { statusCode: "4000" } } }) }
    assert.equal(params.get("value"), "two")
    throw Error("Timeout")
  } })
  const result = await api.getSmsDeliveryReports(["one", "two"])
  assert.equal(result.reports.one.statusCode, "4000")
  assert.equal(result.reports.two, undefined)
  assert.ok(result.error)
  assert.equal(calls.length, 2)
})

test("empty, unrelated, malformed or rejected single results stay unconfirmed", async () => {
  for (const single of [
    { ok: false }, { ok: true, json: async () => ({ messageList: {} }) },
    { ok: true, json: async () => ({ messageList: { other: { statusCode: "4000" } } }) },
    { ok: true, json: async () => ({ messageList: { one: { messageId: "other", statusCode: "4000" } } }) },
    { ok: true, json: async () => { throw Error("invalid json") } },
  ]) {
    const { api } = fixture({ response: url => new URL(url).searchParams.has("messageIds") ? { ok: true, json: async () => ({ messageList: {} }) } : single })
    const result = await api.getSmsDeliveryReports(["one"])
    assert.ok(result.error)
    assert.equal(result.reports.one, undefined)
  }
})

test("batch HTTP failure does not multiply authentication or provider errors into retries", async () => {
  const { api, calls } = fixture({ response: { ok: false, status: 401 } })
  assert.ok((await api.getSmsDeliveryReports(["one", "two"])).error)
  assert.equal(calls.length, 1)
})

test("fallback limits concurrent reads to four and caps a page at twenty unique IDs", async () => {
  let active = 0, peak = 0
  const { api, calls } = fixture({ response: async url => {
    const params = new URL(url).searchParams
    if (params.has("messageIds")) return { ok: true, json: async () => ({ messageList: {} }) }
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setImmediate(resolve))
    active--
    return { ok: true, json: async () => ({ messageList: { [params.get("value")]: { statusCode: "4000" } } }) }
  } })
  const result = await api.getSmsDeliveryReports(Array.from({ length: 25 }, (_, i) => `id${i}`))
  assert.equal(peak, 4)
  assert.equal(calls.length, 21)
  assert.equal(Object.keys(result.reports).length, 20)
})

test("SMS navigation belongs to system management for both member roles", () => {
  const source = fs.readFileSync("src/app/(admin)/admin/(protected)/_components/admin-header.tsx", "utf8") + "\nexports.groups = buildNavGroups;"
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: () => ({}) })
  for (const top of [true, false]) {
    const groups = exports.groups(top)
    assert.ok(!groups.find(g => g.label === "회원").items.some(i => i.href === "/admin/sms"))
    assert.deepEqual(Array.from(groups.find(g => g.label === "시스템 관리").items, i => i.label), ["홈페이지 관리", "SMS 발송 내역", ...(top ? ["오류 로그"] : [])])
  }
  assert.equal(fs.existsSync("src/features/sms/diagnose.ts"), false)
  assert.equal(fs.existsSync("src/features/sms/diagnostic-panel.tsx"), false)
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
      "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
      "@/shared/lib/auth": { requireAdmin: async () => ({ ok: true }) },
      "@/shared/lib/utils": { formatShortDateTime: () => "26.10.08 09:00" },
      "@/features/sms/presentation": load("src/features/sms/presentation.ts"),
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
      assert.match(html, />완료<\/span>/)
      assert.match(html, /26\.10\.08 09:00/)
      assert.match(html, /<details/)
      assert.match(html, /문자 본문/)
      assert.match(html, /\/admin\/applications\/volunteer\/app/)
      assert.match(html, /\/admin\/sms\?page=2/)
      assert.match(html, /name="sms-history"/)
      assert.doesNotMatch(html, /<details[^>]*\sopen(?:=""|\s|>)/)
      assert.match(html, /<span>수신자<\/span><span class="text-center">전화번호<\/span><span class="text-center">발송 일시<\/span><span class="text-center">발송 상태<\/span>/)
      const summary = html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1]
      const labels = ["수신자 ", "전화번호 ", "발송 일시 ", "발송 상태 ", "펼치기"]
      const positions = labels.map(label => summary.indexOf(label))
      assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])))
      assert.match(summary, /group-open:hidden/)
      assert.match(summary, /group-open:inline/)
    }
  }
})
