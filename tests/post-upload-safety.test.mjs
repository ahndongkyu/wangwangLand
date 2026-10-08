import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function formFixture(path, name, props = {}) {
  const slots = []
  let index = 0, writes = 0
  const element = (type, props) => ({ type, props })
  const marker = (name) => name
  const hooks = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value }] },
    useRef(initial) { const i = index++; return slots[i] ??= { current: initial } },
    useActionState() { return [{ error: null }, () => { writes++ }, false] },
  }
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, Date, FormData: class { set() {} get() { return "" } delete() {} }, require(name) {
    if (name === "react") return hooks
    if (name === "react/jsx-runtime") return { jsx: element, jsxs: element }
    if (name === "next/link") return { default: "a" }
    if (name.includes("use-save-feedback")) return { useSaveFeedback: () => ({ pending: false, completed: false, save: async () => { writes++ } }) }
    if (name.includes("use-post-draft-key")) return { usePostDraftKey: () => "draft:test", clearPostDraft() {} }
    if (name.includes("community-category")) return { communityType: value => value ?? "일상", COMMUNITY_TYPES: ["일상"] }
    if (name.includes("rich-text-editor")) return { RichTextEditor: marker("editor") }
    if (name.includes("expense-attachment-uploader")) return { ExpenseAttachmentUploader: marker("attachments") }
    if (name.includes("utils")) return { cn: (...args) => args.join(" ") }
    if (name.includes("/api/")) return {}
    return { Button: "button", Input: "input", Label: "label", Checkbox: "checkbox" }
  } })
  function render() { index = 0; return exports[name](props) }
  function nodes(node) { return !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)] }
  return { render, nodes, writes: () => writes }
}

const cases = [
  ["src/features/daily/components/daily-form.tsx", "DailyForm", {}],
  ["src/features/notices/components/notice-form.tsx", "NoticeForm", {}],
  ["src/features/notices/components/notice-form.tsx", "NoticeForm", { boardType: "expense" }],
  ["src/features/stories/components/story-form.tsx", "StoryForm", { dogs: [] }],
  ["src/features/thanks/components/thanks-form.tsx", "ThanksForm", {}],
  ["src/app/(public)/daily/new/daily-new-form.tsx", "DailyNewForm", {}],
  ["src/app/(public)/stories/new/story-new-form.tsx", "StoryNewForm", {}],
]

test("all post forms lock every save button and block submit until image uploads finish", async () => {
  for (const [path, name, props] of cases) {
    const fixture = formFixture(path, name, props)
    const original = fixture.render()
    const editor = fixture.nodes(original).find(node => node.type === "editor")
    editor.props.onUploadingChange(true)
    // 같은 이벤트 턴에서도 ref로 제출을 차단한다.
    let prevented = false
    await original.props.onSubmit({ preventDefault() { prevented = true }, currentTarget: {} })
    assert.equal(prevented, true, path)
    assert.equal(fixture.writes(), 0, path)
    const busy = fixture.render()
    const buttons = fixture.nodes(busy).filter(node => node.type === "button" && node.props.type === "submit")
    assert.ok(buttons.length)
    assert.ok(buttons.every(node => node.props.disabled && node.props.children === "이미지 업로드 중…"), path)
    editor.props.onUploadingChange(false)
    const ready = fixture.render()
    assert.ok(fixture.nodes(ready).filter(node => node.type === "button" && node.props.type === "submit").every(node => !node.props.disabled))
    if (ready.props.action) ready.props.action()
    else await ready.props.onSubmit({ preventDefault() {}, currentTarget: {} })
    assert.equal(fixture.writes(), 1, path)
  }
})

test("expense attachments also block keyboard submits", async () => {
  const fixture = formFixture(cases[2][0], "NoticeForm", { boardType: "expense" })
  const form = fixture.render()
  fixture.nodes(form).find(node => node.type === "attachments").props.onUploadingChange(true)
  await form.props.onSubmit({ preventDefault() {}, currentTarget: {} })
  assert.equal(fixture.writes(), 0)
})

test("editor accounts for overlapping uploads and releases locks in finally", () => {
  const source = fs.readFileSync("src/shared/components/rich-text-editor.tsx", "utf8")
  assert.match(source, /activeUploads\.current \+= 1/)
  assert.match(source, /finally\s*\{\s*activeUploads\.current -= 1/)
  assert.match(source, /onUploadingChange\?\.\(stillUploading\)/)
})
