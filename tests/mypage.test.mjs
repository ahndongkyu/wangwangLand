import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
const imports = {
  react: React,
  "react/jsx-runtime": require("react/jsx-runtime"),
  "lucide-react": require("lucide-react"),
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "next/image": { default: ({ fill, ...props }) => { void fill; return React.createElement("img", props) } },
  "next/navigation": { redirect: path => { throw new Error(`redirect:${path}`) } },
  "@/shared/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
}
function load(file, mocks = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Date, require: name => {
    assert.ok(name in mocks || name in imports, `Unexpected dependency: ${name}`)
    return mocks[name] ?? imports[name]
  } })
  return exports
}
const tabs = load("src/app/(public)/my/_components/mypage-tabs.tsx")
const category = load("src/features/daily/lib/community-category.ts")

export async function renderMyPage({ confirmed = true, loggedIn = true } = {}) {
  const event = { id: "event", source_application_type: "volunteer", source_application_id: "app", starts_at: "2026-10-10T01:00:00Z", all_day: false }
  const data = {
    volunteer_applications: [{ id: "app", status: "승인", submitted_at: "2026-10-01", available_dates: ["2026-10-10"], available_time: "10:00", party_size: 1 }],
    adoption_applications: [], dog_likes: [], cat_likes: [], daily_posts: [], adoption_stories: [], donation_thanks: [],
    events: confirmed ? [event] : [],
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: loggedIn ? { user: { id: "fixture-member" } } : null } }) },
    from(table) {
      assert.ok(table in data)
      const chain = { select() { return this }, eq() { return this }, in() { return this }, not() { return this }, order() { return this }, limit() { return this }, then(resolve, reject) { return Promise.resolve({ data: data[table], error: null }).then(resolve, reject) } }
      return chain
    },
  }
  const api = load("src/app/(public)/my/page.tsx", {
    "@/features/members": { getCurrentProfile: async () => loggedIn ? ({ nickname: "아이들과함께하는봄날긴닉네임도모두보여요", role: "member", status: "approved" }) : null, DeleteAccountButton: () => React.createElement("button", { type: "button" }, "회원 탈퇴") },
    "@/features/members/api/actions": { signOut: "/fixture-only" },
    "@/features/donations": { listMyDonations: async () => [] },
    "@/features/events": { listMyUpcomingEvents: async () => confirmed ? [event] : [] },
    "@/features/events/lib/date": { formatKoreanDayLabel: () => "10월 10일 (토) 오전 10:00" },
    "@/features/applications/api/volunteer-history": { getVolunteerCountBreakdown: async () => ({ total: 3, yearly: 3, monthly: 1 }) },
    "@/features/daily/lib/community-category": category,
    "@/shared/lib/supabase/server": { createClient: async () => client },
    "@/shared/lib/supabase/admin": { createAdminClient: () => client },
    "./_components/mypage-tabs": tabs,
  })
  return renderToStaticMarkup(await api.default())
}

if (process.env.MYPAGE_FIXTURE === "1") {
  const css = fs.readdirSync(".next/static/chunks").filter(name => name.endsWith(".css"))
  console.log(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>마이페이지 구현 확인</title>${css.map(name => `<link rel="stylesheet" href="http://127.0.0.1:3002/_next/static/chunks/${name}">`).join("")}</head><body class="bg-background text-foreground"><p style="padding:12px;text-align:center;font-size:12px">구현 컴포넌트 확인용 · 예시 데이터 · 실제 계정과 연결되지 않음</p>${await renderMyPage()}</body></html>`)
} else {
  test("my page renders confirmed schedule and full nickname before activity records", async () => {
    const html = await renderMyPage()
    assert.match(html, /아이들과함께하는봄날긴닉네임도모두보여요/)
    assert.match(html, /일정 확정/)
    assert.ok(html.indexOf("다가오는 봉사") < html.indexOf("my-activity-content"))
    assert.doesNotMatch(html, /인증글 작성/)
    assert.match(html, /실제 참석 여부를 집계한 수치는 아닙니다/)
  })
  test("approval without calendar event is not shown as confirmed", async () => {
    const html = await renderMyPage({ confirmed: false })
    assert.match(html, /승인 · 일정 미확정/)
    assert.doesNotMatch(html, /일정 확정/)
    assert.doesNotMatch(html, /\/calendar\/event/)
  })
  test("logged-out my page redirects instead of returning private records", async () => {
    await assert.rejects(renderMyPage({ loggedIn: false }), /redirect:\/login/)
  })
}
