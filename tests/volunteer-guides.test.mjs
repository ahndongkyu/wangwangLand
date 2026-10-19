import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
function component(file) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function("exports", "require", code)(exports, name =>
    name === "@/shared/constants/site" ? { SITE: { sns: { kakaoChannel: "https://example.com/channel" } } } : require(name))
  return exports
}
const { VolunteerPreparationGuide } = component("src/features/applications/components/volunteer-preparation-guide.tsx")
const { VolunteerContactGuide } = component("src/features/applications/components/volunteer-contact-guide.tsx")

test("preparation stays visible without an approval warning after approval", () => {
  for (const showApprovalNotice of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(VolunteerPreparationGuide, { showApprovalNotice }))
    assert.match(html, /목장갑/)
    assert.match(html, /100L 쓰레기봉투 한 장/)
    assert.match(html, /필수 준비물은 아니/)
    assert.equal(html.includes("신청만으로 방문이 확정되지는 않습니다"), showApprovalNotice)
  }
})
test("contact guide renders correct phone and safe channel link", () => {
  const html = renderToStaticMarkup(React.createElement(VolunteerContactGuide))
  assert.match(html, /href="tel:01035403156"/)
  assert.match(html, /010-3540-3156/)
  assert.match(html, /noopener noreferrer/)
  assert.match(html, /마이페이지 → 신청 내역/)
  assert.doesNotMatch(html, /9999|예시/)
})
test("completion and member details render preparation followed by contact guide", () => {
  const form = fs.readFileSync("src/features/applications/components/volunteer-form.tsx", "utf8")
  const completion = form.slice(form.indexOf("if (success)"), form.indexOf("<form ref="))
  assert.match(completion, /VolunteerPreparationGuide[\s\S]*VolunteerContactGuide/)
  assert.match(completion, /\{visitTime\}/)
  const my = fs.readFileSync("src/app/(public)/my/applications/page.tsx", "utf8")
  assert.match(my, /VolunteerPreparationGuide showApprovalNotice=[\s\S]*<VolunteerContactGuide \/>/)
  assert.match(my, /\{v\.admin_note\}/)
})
