import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"

function harness() {
  const state = [], refs = [], calls = []
  let cursor = 0, refCursor = 0
  const exports = {}
  const imports = {
    react: {
      useState(initial) {
        const slot = cursor++
        if (!(slot in state)) state[slot] = initial
        return [state[slot], value => { state[slot] = value }]
      },
      useRef(initial) { const slot = refCursor++; return refs[slot] ??= { current: initial } },
    },
    "next/navigation": { useRouter: () => ({
      replace: path => calls.push(["replace", path]), refresh: () => calls.push(["refresh"]),
    }) },
    "@/shared/components/toast": { useToast: () => ({
      success: text => calls.push(["success", text]), error: text => calls.push(["error", text]),
      warning: text => calls.push(["warning", text]),
    }) },
  }
  const code = ts.transpileModule(readFileSync("src/shared/lib/use-save-feedback.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { exports, require: name => { assert.ok(name in imports); return imports[name] } })
  return {
    calls,
    render() { cursor = 0; refCursor = 0; return exports.useSaveFeedback(message => calls.push(["inline", message])) },
  }
}

test("save success shows feedback before client navigation and closes the editor", async () => {
  const h = harness()
  await h.render().save(async () => ({ redirectTo: "/admin/notices" }), "저장 완료")
  assert.equal(h.render().completed, true)
  assert.deepEqual(h.calls, [["inline", null], ["success", "저장 완료"], ["replace", "/admin/notices"], ["refresh"]])
})

test("explicit list destination overrides a detail destination", async () => {
  const h = harness()
  await h.render().save(async () => ({ redirectTo: "/daily/1" }), "저장 완료", "/daily")
  assert.ok(h.calls.some(([type, value]) => type === "replace" && value === "/daily"))
})

test("saved approval with SMS warning navigates without offering duplicate approval", async () => {
  const h = harness()
  await h.render().save(async () => ({ warning: "문자 결과 확인 필요" }), "승인 완료", "/admin/applications")
  assert.equal(h.render().completed, true)
  assert.ok(h.calls.some(([type, text]) => type === "warning" && text === "승인 완료 문자 결과 확인 필요"))
  assert.ok(h.calls.some(([type]) => type === "replace"))
  assert.equal(h.calls.some(([type]) => type === "success"), false)
})

test("server errors and interrupted responses keep the editor open and allow retry", async () => {
  for (const action of [
    async () => ({ error: "저장 실패" }),
    async () => { throw new Error("offline") },
    async () => undefined,
  ]) {
    const h = harness()
    await h.render().save(action, "저장 완료", "/list")
    assert.equal(h.render().completed, false)
    assert.equal(h.render().pending, false)
    assert.equal(h.calls.some(([type]) => type === "replace" || type === "success"), false)
    assert.ok(h.calls.some(([type, text]) => type === "error" && text))
    await h.render().save(async () => ({}), "저장 완료", "/list")
    assert.equal(h.render().completed, true)
  }
})

test("double click cannot create duplicate writes while pending or completed", async () => {
  const h = harness()
  let finish, writes = 0
  const action = () => { writes++; return new Promise(resolve => { finish = resolve }) }
  const save = h.render().save(action, "저장 완료", "/list")
  assert.equal(h.render().pending, true)
  await h.render().save(action, "저장 완료", "/list")
  assert.equal(writes, 1)
  finish({})
  await save
  await h.render().save(action, "저장 완료", "/list")
  assert.equal(writes, 1)
})

test("editing forms prevent automatic action resets on failed saves", () => {
  for (const name of ["animals/animal", "thanks/thanks", "events/event"]) {
    const [feature, form] = name.split("/")
    const source = readFileSync(`src/features/${feature}/components/${form}-form.tsx`, "utf8")
    assert.match(source, /onSubmit=\{handleSubmit\}/)
    assert.doesNotMatch(source, /action=\{handleSubmit\}/)
    assert.match(source, /preventDefault\(\)/)
  }
})
