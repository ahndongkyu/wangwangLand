import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { load, renderMembers, renderStaff, renderApplicationList, renderDonations } from "./helpers/page-review-fixtures.mjs"

test("member and staff metadata headers and cells share desktop center alignment", async () => {
  for (const html of [await renderMembers(), await renderStaff()]) {
    for (const label of ["전화번호", "이용 상태", "권한", "가입일"]) assert.ok(html.includes(`<span class="text-center">${label}</span>`))
    assert.match(html, /xl:pl-0 xl:text-center/)
    assert.match(html, /xl:justify-self-center/)
    assert.match(html, /xl:block xl:text-center/)
  }
})

test("application and donation metadata remain centered only at desktop breakpoints", async () => {
  for (const type of ["volunteer", "adoption"]) {
    const html = renderApplicationList({ type }, [{ id: "test", applicant_name: "신청자", phone: "01000000000", status: "접수", submitted_at: "2026-10-08T00:00:00Z", ...(type === "volunteer" ? { party_size: 2, available_dates: ["2026-10-18"], available_time: "10:00" } : { reason: "입양 상담", visit_available_dates: ["2026-10-18"] }) }])
    assert.match(html, /class="text-center">신청일시/)
    assert.match(html, /class="text-center">처리 상태/)
    assert.match(html, /xl:row-auto xl:text-center/)
  }
  const donations = await renderDonations()
  assert.match(donations, /class="text-center">후원일/)
  assert.match(donations, /lg:text-center/)
})

test("admin post lists center metadata but keep titles left aligned", () => {
  for (const type of ["notices", "daily", "stories"]) {
    const source = readFileSync(`src/features/${type}/components/admin-${type}-table.tsx`, "utf8")
    assert.match(source, /<table className="[^"]*text-center/)
    assert.match(source, /text-left">제목/)
    assert.match(source, /max-w-xs text-left/)
    assert.match(source, /text-center">작성일/)
  }
})

test("SMS statuses never treat provider acceptance or unknown codes as delivery completion", () => {
  const { smsStatusPresentation: status } = load("src/features/sms/presentation.ts")
  assert.equal(status("accepted", "4000").label, "완료")
  for (const code of ["2000", "3000"]) assert.equal(status("accepted", code).label, "진행 중")
  assert.equal(status("failed").label, "실패")
  assert.equal(status("pending").label, "진행 중")
  for (const code of [undefined, "9999"]) assert.equal(status("accepted", code).label, "미확인")
  assert.match(status("accepted", "4000").className, /dark:/)
})

test("short timestamps use Korea time, two digit years and invalid-date fallback", () => {
  const { formatShortDateTime } = load("src/shared/lib/utils.ts", { clsx: { clsx: () => "" }, "tailwind-merge": { twMerge: () => "" } })
  assert.equal(formatShortDateTime("2026-10-07T15:00:00Z"), "26.10.08 00:00")
  assert.equal(formatShortDateTime("2026-12-31T15:05:00Z"), "27.01.01 00:05")
  assert.equal(formatShortDateTime("invalid"), "—")
})
