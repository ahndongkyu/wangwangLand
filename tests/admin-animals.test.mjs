import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsx from "react/jsx-runtime"

function load(path, imports = {}, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { exports, URLSearchParams, console, require: name => {
    if (name === "react/jsx-runtime") return jsx
    assert.ok(name in imports, `Missing import: ${name}`)
    return imports[name]
  }, ...globals })
  return exports
}
const filters = load("src/features/animals/lib/admin-filters.ts")

test("animal filters normalize malformed URLs and preserve valid filters", () => {
  for (const page of ["0", "-1", "Infinity", "1.5", "1000001", ["2"]]) {
    const parsed = filters.parseAnimalFilters("dogs", { page, status: "invalid", size: ["중"], pageSize: "19" })
    assert.equal(parsed.page, 1)
    assert.equal(parsed.status, "전체")
    assert.equal(parsed.size, "전체")
    assert.equal(parsed.pageSize, 20)
  }
  const valid = filters.parseAnimalFilters("dogs", { q: " 보리 ", status: "보호중", size: "중", gender: "암컷", neutered: "false", sort: "pinned", pageSize: "50", page: "3" })
  assert.equal(valid.q, "보리")
  assert.equal(valid.page, 3)
  const url = filters.animalListHref("dogs", filters.animalFilterParams(valid))
  assert.equal(new URL(url, "https://example.test").searchParams.get("neutered"), "false")
  assert.equal(new URL(url, "https://example.test").searchParams.has("page"), false)
  const cat = filters.parseAnimalFilters("cats", { size: "중", sort: "pinned" })
  assert.equal(cat.size, "전체")
  assert.equal(cat.sort, "latest")
})

function queryHarness(kind, authorized = true) {
  const calls = []
  const query = { then(resolve) { resolve({ data: [], count: 7, error: null }) } }
  for (const name of ["select", "eq", "in", "or", "range", "order"]) query[name] = (...args) => { calls.push([name, ...args]); return query }
  const api = load(`src/features/${kind}/api/queries.ts`, {
    "@/shared/lib/supabase/server": { createClient: async () => ({ from: table => { calls.push(["from", table]); return query } }) },
    "@/shared/lib/auth": { requireAdmin: async () => { calls.push(["auth"]); return { ok: authorized } } },
    "@/features/settings/api/homepage-queries": {},
  })
  return { calls, list: kind === "dogs" ? api.listDogsWithCount : api.listCatsWithCount }
}

test("private animal location is selected only after staff authorization", async () => {
  for (const kind of ["dogs", "cats"]) {
    const publicRead = queryHarness(kind)
    await publicRead.list()
    assert.doesNotMatch(publicRead.calls.find(c => c[0] === "select")[1], /kennel_location/)
    assert.equal(publicRead.calls.some(c => c[0] === "auth"), false)
    const denied = queryHarness(kind, false)
    assert.equal((await denied.list({ includeLocation: true })).total, 0)
    assert.equal(denied.calls.some(c => c[0] === "from"), false)
    const admin = queryHarness(kind)
    const result = await admin.list({ includeLocation: true, status: "보호중", gender: "암컷", neutered: "false", query: "보리", limit: 50, offset: 100, sort: "name" })
    assert.equal(result.total, 7)
    assert.match(admin.calls.find(c => c[0] === "select")[1], /kennel_location/)
    assert.ok(admin.calls.findIndex(c => c[0] === "auth") < admin.calls.findIndex(c => c[0] === "from"))
    assert.ok(admin.calls.some(c => c[0] === "range" && c[1] === 100 && c[2] === 149))
    assert.ok(admin.calls.some(c => c[0] === "eq" && c[1] === "neutered" && c[2] === false))
    assert.ok(admin.calls.some(c => c[0] === "or" && c[1].includes("breed.ilike")))
  }
})

function hooks() {
  const state = [], refs = []
  let cursor = 0, refCursor = 0
  return {
    reset() { cursor = 0; refCursor = 0 },
    react: {
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value }] },
      useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial } },
    },
  }
}
function nodes(element) {
  if (!element || typeof element !== "object") return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}

test("dog and cat wrappers share form layout and retain create/update destinations", async () => {
  for (const [kind, name] of [["dogs", "Dog"], ["cats", "Cat"]]) {
    const calls = []
    const Form = () => null
    const loaded = load(`src/features/${kind}/components/${name.toLowerCase()}-form.tsx`, {
      "@/features/animals/components/animal-form": { AnimalForm: Form },
      "../api/mutations": { [`create${name}`]: async data => calls.push(["create", data]), [`update${name}`]: async (id, data) => calls.push(["update", id, data]) },
    })
    const create = loaded[`${name}Form`]({})
    assert.equal(create.type, Form)
    assert.equal(create.props.kind, kind)
    await create.props.onSave("new")
    await loaded[`${name}Form`]({ [name.toLowerCase()]: { id: "existing" } }).props.onSave("edit")
    assert.deepEqual(calls, [["create", "new"], ["update", "existing", "edit"]])
  }
})

test("image removal preserves the representative index and controls remain accessible", () => {
  const h = hooks()
  const component = load("src/shared/components/animal-image-uploader.tsx", {
    react: h.react, "next/image": { default: "img" }, "lucide-react": { ImageIcon: "svg", Loader2: "svg", Upload: "svg", X: "svg" },
    "@/shared/components/image-crop-modal": { ImageCropModal: "crop" }, "@/shared/lib/utils": { cn: (...args) => args.filter(Boolean).join(" ") },
  })
  const render = () => { h.reset(); return nodes(component.AnimalImageUploader({ folder: "dogs", initialImages: ["one", "two", "three"], initialThumbnailIndex: 2 })) }
  render().find(n => n.props?.["aria-label"] === "1번 이미지 삭제").props.onClick()
  assert.equal(render().find(n => n.props?.name === "thumbnail_index").props.value, 1)
  assert.equal(render().find(n => n.props?.name === "images").props.value, "two,three")
  assert.equal(render().find(n => n.props?.["aria-label"] === "2번 이미지를 대표로 선택").props["aria-pressed"], true)
  render().find(n => n.props?.["aria-label"] === "2번 이미지 삭제").props.onClick()
  assert.equal(render().find(n => n.props?.name === "thumbnail_index").props.value, 0)
})

test("invalid and failed photo uploads release the form lock and retain existing images", async () => {
  const h = hooks(), busy = []
  const component = load("src/shared/components/animal-image-uploader.tsx", {
    react: h.react, "next/image": { default: "img" }, "lucide-react": {},
    "@/shared/components/image-crop-modal": { ImageCropModal: "crop" }, "@/shared/lib/utils": { cn: () => "" },
  }, {
    FileReader: class { readAsDataURL() { this.result = "data:image/png;base64,AA"; this.onload() } },
    crypto: { randomUUID: () => "id" },
    fetch: async () => ({ ok: false, json: async () => { throw new Error("empty response") } }),
  })
  const render = () => { h.reset(); return nodes(component.AnimalImageUploader({ folder: "cats", initialImages: ["existing"], onBusyChange: value => busy.push(value) })) }
  const select = file => render().find(n => n.props?.type === "file").props.onChange({ target: { files: [file], value: "selected" } })
  select({ type: "image/png", size: 11 * 1024 * 1024 })
  assert.equal(busy.length, 0)
  assert.ok(render().some(n => n.props?.role === "alert"))
  select({ type: "image/png", size: 100 })
  assert.deepEqual(busy, [true])
  render().find(n => n.type === "crop").props.onDone({})
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(busy, [true, false])
  assert.equal(render().find(n => n.props?.name === "images").props.value, "existing")
  assert.ok(render().some(n => n.props?.role === "alert"))
})

test("shared form retains all existing fields, rescue date and birth-date age behavior", () => {
  for (const kind of ["dogs", "cats"]) {
    const h = hooks()
    const component = load("src/features/animals/components/animal-form.tsx", {
      react: h.react, "next/link": { default: "a" },
      "@/shared/components/animal-image-uploader": { AnimalImageUploader: "uploader" },
      "@/shared/components/ui/button": { Button: "button" }, "@/shared/components/ui/input": { Input: "input" }, "@/shared/components/ui/textarea": { Textarea: "textarea" },
      "@/shared/lib/age": { ageMonthsFromBirthDate: () => 24, formatAgeMonths: () => "2살" },
      "@/shared/lib/use-save-feedback": { useSaveFeedback: () => ({ save: () => {}, pending: false, completed: false }) },
      "../lib/admin-filters": filters,
    })
    const tree = nodes(component.AnimalForm({ kind, animal: { name: "보리", birth_date: "2024-01-01", rescue_date: "2026-01-01", images: ["photo"], thumbnail_index: 0 }, onSave: async () => ({}) }))
    for (const field of ["name", "breed", "gender", "birth_date", "age_months", "weight_kg", "status", "neutered", "rescue_date", "kennel_location", "health_info", "personality", "description"]) {
      assert.ok(tree.some(n => n.props?.name === field), field)
    }
    assert.equal(tree.some(n => n.props?.name === "size"), kind === "dogs")
    assert.equal(tree.find(n => n.props?.name === "rescue_date").props.defaultValue, "2026-01-01")
    assert.equal(tree.find(n => n.props?.name === "age_months").props.disabled, true)
    assert.equal(tree.find(n => n.type === "uploader").props.folder, kind)
  }
})

test("status changes dispatch to the right animal API and failures never show success", async () => {
  for (const kind of ["dogs", "cats"]) {
    for (const failed of [false, true]) {
      const calls = [], h = hooks(), jobs = []
      const mutation = label => async (...args) => { calls.push([label, ...args]); return failed ? { error: "변경 실패" } : {} }
      const component = load("src/features/animals/components/animal-row-controls.tsx", {
        react: { ...h.react, useTransition: () => [false, fn => jobs.push(fn())] }, "@base-ui/react/menu": {}, "lucide-react": {},
        "next/navigation": { useRouter: () => ({ refresh: () => calls.push(["refresh"]) }) },
        "@/features/dogs/api/mutations": { updateDogStatus: mutation("dogs") }, "@/features/cats/api/mutations": { updateCatStatus: mutation("cats") },
        "@/shared/components/confirm-dialog": {}, "@/shared/components/toast": { useToast: () => ({ success: value => calls.push(["success", value]), error: value => calls.push(["error", value]) }) },
        "@/shared/lib/utils": { cn: () => "" }, "../lib/admin-filters": filters,
      })
      const tree = nodes(component.AnimalStatusSelect({ kind, id: "1", name: "보리", status: "보호중" }))
      tree.find(n => n.type === "select").props.onChange({ target: { value: "입양완료" } })
      await Promise.all(jobs)
      assert.deepEqual(calls[0], [kind, "1", "입양완료"])
      assert.equal(calls.some(c => c[0] === "success"), !failed)
      assert.equal(calls.some(c => c[0] === "refresh"), !failed)
      assert.equal(calls.some(c => c[0] === "error"), failed)
    }
  }
})

test("animal deletion cancellation never writes and confirmation blocks repeated clicks", async () => {
  for (const approved of [false, true]) {
    const h = hooks(), jobs = [], calls = []
    let resolveConfirm
    const component = load("src/features/animals/components/animal-row-controls.tsx", {
      react: { ...h.react, useTransition: () => [false, fn => jobs.push(fn())] },
      "@base-ui/react/menu": { Menu: Object.fromEntries(["Root", "Trigger", "Portal", "Positioner", "Popup", "Item"].map(v => [v, v])) }, "lucide-react": { MoreHorizontal: "svg" },
      "next/navigation": { useRouter: () => ({ refresh: () => calls.push("refresh") }) },
      "@/features/dogs/api/mutations": { deleteDog: async () => { calls.push("delete"); return {} } }, "@/features/cats/api/mutations": {},
      "@/shared/components/confirm-dialog": { useConfirm: () => () => new Promise(resolve => { resolveConfirm = resolve; calls.push("confirm") }) },
      "@/shared/components/toast": { useToast: () => ({ success: () => {}, error: () => {} }) },
      "@/shared/lib/utils": {}, "../lib/admin-filters": filters,
    })
    const click = nodes(component.AnimalRowMenu({ kind: "dogs", id: "1", name: "보리" })).find(n => n.type === "Item").props.onClick
    const request = click()
    await click()
    assert.deepEqual(calls, ["confirm"])
    resolveConfirm(approved ? { ok: true } : false)
    await request
    await Promise.all(jobs)
    assert.equal(calls.includes("delete"), approved)
  }
})
