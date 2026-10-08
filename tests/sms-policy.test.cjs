const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: name => {
    if (name in mocks) return mocks[name]
    if (name === '@/features/operation-logs/server') return { recordOperationError: async () => {} }
    throw new Error(`Unexpected dependency: ${name}`)
  }, ...globals })
  return exports
}

const { volunteerSmsKind: kind, buildVolunteerSms: build } = load('src/features/applications/lib/volunteer-sms.ts')

test('only confirmed, changed and operator-cancelled visits send SMS', () => {
  assert.equal(kind('접수', '승인', 1, false, false), 'confirmed')
  assert.equal(kind('승인', '승인', 1, false, false), 'confirmed')
  assert.equal(kind('일정변경요청', '승인', 1, true, false), 'rescheduled')
  assert.equal(kind('승인', '취소', 0, true, false), 'cancelled')
  assert.equal(kind('일정변경요청', '취소', 0, true, false), 'cancelled')
})

test('no SMS for no schedule, duplicate save, review, rejection or unconfirmed cancellation', () => {
  for (const prev of ['접수', '검토중', '승인', '일정변경요청', '취소']) {
    for (const next of ['접수', '검토중', '반려']) assert.equal(kind(prev, next, 0, true, false), null)
  }
  assert.equal(kind('접수', '승인', 0, false, false), null)
  assert.equal(kind('승인', '승인', 0, true, false), null)
  assert.equal(kind('일정변경요청', '승인', 0, true, true), null)
  assert.equal(kind('접수', '취소', 0, false, false), null)
  assert.equal(kind('취소', '취소', 0, true, false), null)
})

test('LMS includes correct Korean date, party size and application link', () => {
  for (const mode of ['confirmed', 'rescheduled']) {
    const message = build(mode, '홍길동', ['2026-10-20T07:50:00Z'], 3)
    assert.equal(message.type, 'LMS')
    assert.ok(message.text.includes('2026.10.20(화) 16:50'))
    assert.ok(message.text.includes('참여 인원: 3명'))
    assert.ok(message.text.endsWith('https://wangwangland.kr/my/applications'))
    assert.ok(message.text.includes('마이페이지에서 요청하실 수 있습니다.'))
  }
  assert.ok(build('rescheduled', '홍길동', ['2026-10-20T07:50:00Z'], 3).text.includes('기존 일정 대신'))
  assert.throws(() => build('confirmed', '홍길동', [], 3))
})

test('cancellation is SMS within 90 bytes regardless of name or group length', () => {
  const message = build('cancelled', '긴단체명'.repeat(100), [], 30)
  assert.equal(message.type, 'SMS')
  assert.ok([...message.text].reduce((sum, c) => sum + (c.charCodeAt(0) > 127 ? 2 : 1), 0) <= 90)
})

test('provider delivery state changes on subsequent uncached reads without sending messages', async () => {
  let code = '2000'
  const sms = load('src/features/sms/index.ts', {
    'server-only': {}, crypto: {randomBytes: () => ({toString: () => 'salt'}), createHmac: () => ({update: () => ({digest: () => 'signature'})})},
    '@/shared/lib/supabase/admin': {}, '@/shared/lib/auth': {requireAdmin: async () => ({ok:true})},
  }, {process: {env:{SOLAPI_API_KEY:'test', SOLAPI_API_SECRET:'test'}}, URLSearchParams, AbortSignal,
    fetch: async (url, options) => {
      assert.ok(url.includes('/messages/v4/list?'))
      assert.equal(options.cache, 'no-store')
      return {ok:true, json:async () => ({messageList:{one:{statusCode:code}}})}
    },
  })
  assert.equal((await sms.getSmsDeliveryReports(['one'])).reports.one.statusCode, '2000')
  code = '4000'
  assert.equal((await sms.getSmsDeliveryReports(['one'])).reports.one.statusCode, '4000')
  assert.ok((await sms.getSmsDeliveryReports(['missing'])).error)
})

test('polling refreshes visible tab, pauses hidden/pending, and cleans up listeners', () => {
  for (const pending of [false, true]) {
    let callback, cleanup, refreshed = 0, removed = 0
    const document = {hidden:false, addEventListener: (event, fn) => {assert.equal(event,'visibilitychange'); callback = fn}, removeEventListener: () => removed++}
    const {SmsAutoRefresh} = load('src/features/sms/auto-refresh.tsx', {
      react: {useEffect: fn => {cleanup = fn()}, useTransition: () => [pending, fn => fn()]},
      'next/navigation': {useRouter: () => ({refresh: () => refreshed++})},
      'react/jsx-runtime': {jsx: () => null, jsxs: () => null},
    }, {document, window:{setInterval: (fn, ms) => {assert.equal(ms,15000); callback = fn; return 1}, clearInterval: () => removed++}})
    SmsAutoRefresh()
    callback()
    assert.equal(refreshed, pending ? 0 : 1)
    document.hidden = true
    callback()
    assert.equal(refreshed, pending ? 0 : 1)
    cleanup()
    assert.equal(removed, 2)
  }
})

test('only volunteer mutation retains a sendSms call; adoption retains push', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/applications/api/mutations.ts'), 'utf8')
  assert.equal((source.match(/await sendSms\(/g) || []).length, 1)
  const adoption = source.slice(source.indexOf('export async function updateAdoptionApplication'), source.indexOf('function pushTitleForStatus'))
  assert.ok(adoption.includes('sendPushToUser'))
  assert.ok(!adoption.includes('sendSms'))
})
