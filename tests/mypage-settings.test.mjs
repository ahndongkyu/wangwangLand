import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsx from "react/jsx-runtime"
import { load, renderMyPage } from "./helpers/page-review-fixtures.mjs"

test("my page separates activity and settings and preserves the old profile address", async () => {
  const activity = await renderMyPage()
  assert.match(activity, /다가오는 봉사/)
  assert.match(activity, /신청 내역 · 내 글 · 후원 기록 · 관심 동물/)
  assert.doesNotMatch(activity, /회원 탈퇴|마케팅·알림 수신/)
  const settings = await renderMyPage({ tab: "settings" })
  assert.match(settings, /프로필 정보/)
  assert.match(settings, /aria-label="마케팅·알림 수신 동의"/)
  assert.match(settings, /로그아웃|회원 탈퇴/)
  assert.doesNotMatch(settings, /다가오는 봉사/)
  const page = load("src/app/(public)/profile/page.tsx", { "next/navigation": { redirect: href => { throw Error(href) } } }).default
  assert.throws(page, /\/my\?tab=settings/)
})

test("phone registration opens an uncancellable editor and activity still requires consent", async () => {
  await assert.rejects(renderMyPage({ phone: null }), /Redirect \/my\?tab=settings/)
  const html = await renderMyPage({ tab: "settings", phone: null })
  assert.match(html, /전화번호를 등록해주세요/)
  assert.match(html, /<input(?=[^>]*name="phone")(?=[^>]*required)[^>]*>/)
  assert.doesNotMatch(html, />취소</)
  await assert.rejects(renderMyPage({ agreed: false }), /Redirect \/agreement/)
  assert.match(await renderMyPage({ tab: "settings", agreed: false }), /프로필 정보/)
  for (const [options, destination] of [[{ loggedIn: false }, "login"], [{ status: "pending" }, "pending"], [{ status: "rejected" }, "rejected"]]) {
    await assert.rejects(renderMyPage({ tab: "settings", ...options }), new RegExp(`Redirect /${destination}`))
  }
})

function formHarness({ phone = "010-0000-0000", startEditing = false, result = { success: true, avatarUrl: null } } = {}) {
  const states = [], refs = [], calls = []
  let stateCursor = 0, refCursor = 0
  const imports = {
    react: {
      useState(initial) { const i = stateCursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value }] },
      useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial } },
      useTransition: () => [false, callback => { calls.push(callback()) }],
    },
    "react/jsx-runtime": jsx,
    "next/navigation": { useRouter: () => ({ refresh: () => calls.push("refresh"), replace: href => calls.push(["replace", href]) }) },
    "next/image": { default: "img" }, "lucide-react": { User: "svg" },
    "../api/actions": { updateProfile: async (_, data) => { calls.push(["write", data]); return typeof result === "function" ? result() : result } },
    "@/shared/components/ui/button": { Button: "button" }, "@/shared/components/ui/input": { Input: "input" },
    "@/shared/components/image-crop-modal": { ImageCropModal: "crop" },
    "@/shared/components/toast": { useToast: () => ({ success: message => calls.push(["success", message]), error: message => calls.push(["error", message]) }) },
    "@/shared/lib/validation": load("src/shared/lib/validation.ts"),
    "@/shared/components/phone-input": { PhoneInput: "phone" },
  }
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/members/components/profile-form.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => { assert.ok(name in imports, name); return imports[name] },
    FormData: class extends FormData { constructor(entries) { super(); for (const [key, value] of entries) this.set(key, value) } },
    FileReader: class { readAsDataURL() { this.result = "data:image/jpeg;base64,photo"; this.onload() } },
  })
  function nodes(node) { if (!node || typeof node !== "object") return []; return [node, ...[].concat(node.props?.children ?? []).flatMap(nodes)] }
  return {
    calls,
    render() { stateCursor = refCursor = 0; return nodes(exports.ProfileForm({ profile: { nickname: "기존닉네임", phone, avatar_url: null }, startEditing })) },
    async submit() { this.render().find(node => node.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: [["nickname", "새닉네임"], ["phone", "01012345678"]] }); await Promise.all(calls.filter(value => typeof value?.then === "function")) },
  }
}

test("profile saves show feedback, leave edit mode, and permit another save", async () => {
  const h = formHarness({ startEditing: true })
  await h.submit()
  assert.equal(h.calls.filter(call => call[0] === "write").length, 1)
  assert.ok(h.calls.includes("refresh"))
  assert.ok(h.calls.some(call => call[0] === "success"))
  let tree = h.render()
  assert.equal(tree.some(node => node.type === "input" && node.props.name === "nickname"), false)
  assert.ok(tree.some(node => node.props?.children === "새닉네임"))
  tree.find(node => node.type === "button" && node.props.children === "수정").props.onClick()
  await h.submit()
  assert.equal(h.calls.filter(call => call[0] === "write").length, 2)
})

test("failed profile saves retain editor and do not announce success", async () => {
  for (const result of [{ error: "중복 닉네임" }, () => { throw Error("offline") }]) {
    const h = formHarness({ startEditing: true, result })
    await h.submit()
    assert.ok(h.render().some(node => node.type === "input" && node.props.name === "nickname"))
    assert.ok(h.render().some(node => node.props.role === "alert"))
    assert.equal(h.calls.includes("refresh"), false)
    assert.equal(h.calls.some(call => call[0] === "success"), false)
  }
})

test("photo changes enter edit mode and cancelling clears the pending image", () => {
  const h = formHarness()
  const fileInput = h.render().find(node => node.type === "input" && node.props.type === "file")
  fileInput.props.onChange({ target: { files: [{ type: "image/jpeg", size: 10 }], value: "photo" } })
  h.render().find(node => node.type === "crop").props.onDone("cropped", "preview")
  assert.ok(h.render().some(node => node.type === "img" && node.props.src === "preview"))
  h.render().find(node => node.type === "button" && node.props.children === "취소").props.onClick()
  assert.equal(h.render().some(node => node.type === "img"), false)
  assert.equal(h.render().some(node => node.props.name === "nickname"), false)
})

test("duplicate saves are blocked until the request completes", async () => {
  let finish
  const h = formHarness({ startEditing: true, result: () => new Promise(resolve => { finish = resolve }) })
  const first = h.submit()
  const second = h.submit()
  assert.equal(h.calls.filter(call => call[0] === "write").length, 1)
  finish({ success: true })
  await Promise.all([first, second])
})

test("middleware overwrites client-supplied settings headers and only exempts the exact settings tab", async () => {
  const exports = {}
  const code = ts.transpileModule(readFileSync("src/shared/lib/supabase/middleware.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Headers, process: { env: {} }, require: name => {
    if (name === "@supabase/ssr") return { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }
    if (name === "next/server") return { NextResponse: { next: value => value } }
    throw Error(name)
  } })
  for (const [path, expected] of [["/my?tab=settings", "true"], ["/my", "false"], ["/my/applications?tab=settings", "false"], ["/my?tab=settings&tab=activity", "false"]]) {
    const request = { headers: new Headers({ "x-mypage-settings": "true" }), nextUrl: new URL(`https://example.test${path}`), cookies: { getAll: () => [] } }
    const response = await exports.updateSession(request)
    assert.equal(response.request.headers.get("x-mypage-settings"), expected)
  }
})
