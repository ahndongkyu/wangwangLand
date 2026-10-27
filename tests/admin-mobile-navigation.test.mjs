import test from "node:test"
import assert from "node:assert/strict"
import { renderLogScreen } from "./helpers/mobile-detail-fixture.mjs"

for (const kind of ["sms", "logs"]) {
  test(`${kind} detail checks authorization before reading records`, async () => {
    const result = await renderLogScreen(kind, { detail: true, authorized: false })
    assert.equal(result.reads, 0)
    assert.match(result.html, /권한 없음/)
  })
  test(`${kind} invalid and missing records are 404, DB failure is not an empty record`, async () => {
    await assert.rejects(renderLogScreen(kind, { detail: true, params: { id: "invalid" } }), /NOT_FOUND/)
    await assert.rejects(renderLogScreen(kind, { detail: true, missing: true }), /NOT_FOUND/)
    const { html } = await renderLogScreen(kind, { detail: true, failed: true })
    assert.match(html, /role="alert"/)
  })
}
test("SMS explanation and body appear only on the separate detail page", async () => {
  const list = await renderLogScreen("sms")
  const detail = await renderLogScreen("sms", { detail: true, params: { page: "3" } })
  assert.doesNotMatch(list.html, /수신 번호 확인 필요|문자 본문 예시|<details/)
  assert.match(detail.html, /수신 번호 확인 필요/)
  assert.match(detail.html, /문자 본문 예시/)
  assert.match(detail.html, /href="\/admin\/sms\?page=3"/)
  assert.match(detail.html, /관련 신청 보기/)
})
test("error context is loaded on detail and list filters survive return", async () => {
  const list = await renderLogScreen("logs")
  const detail = await renderLogScreen("logs", { detail: true, params: { status: "open", operation: "upload", page: "2" } })
  assert.doesNotMatch(list.html, /STORAGE_TIMEOUT|화면 경로|<details/)
  assert.match(detail.html, /입양 상담 상세/)
  assert.match(detail.html, /화면 경로/)
  assert.match(detail.html, /STORAGE_TIMEOUT/)
  assert.match(detail.html, /status=open&amp;operation=upload&amp;page=2/)
})
