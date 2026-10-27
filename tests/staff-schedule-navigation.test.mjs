import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsx from "react/jsx-runtime"

function harness(monthStart = "2026-10-01", pending = false) {
  const pushes = []
  const selections = []
  const imports = {
    react: {
      useMemo: fn => fn(),
      useState: initial => [initial, value => selections.push(value)],
      useTransition: () => [pending, fn => fn()],
    },
    "react/jsx-runtime": jsx,
    "next/navigation": { useRouter: () => ({ push: (href, options) => pushes.push({ href, scroll: options.scroll }) }) },
    "lucide-react": Object.fromEntries(["ChevronLeft", "ChevronRight", "Pencil", "Trash2", "X"].map(name => [name, name])),
    "@/shared/components/ui/button": { Button: "button" },
    "@/shared/components/ui/input": { Input: "input" },
    "@/shared/components/ui/label": { Label: "label" },
    "@/shared/components/toast": { useToast: () => ({}) },
    "@/shared/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "../api/mutations": {},
    "../permanent-staff": {},
  }
  const exports = {}
  const source = readFileSync("src/features/staff-schedule/components/staff-schedule-calendar.tsx", "utf8")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  // No window is supplied: accidental full-page navigation must fail these tests.
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(name in imports, `Missing import: ${name}`)
    return imports[name]
  } })
  const tree = exports.StaffScheduleCalendar({ monthStart, items: [], staff: [], currentUserId: "staff" })
  function nodes(node) {
    if (!node || typeof node !== "object") return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children)]
  }
  const all = nodes(tree)
  const buttons = all.filter(node => node.type === "button" && (node.props["aria-label"] || node.props.children === "오늘"))
  return { pushes, selections, buttons, all }
}

test("month navigation uses client history without resetting scroll, including year boundaries", () => {
  for (const [month, label, expected] of [
    ["2026-10-01", "이전 달", "2026-09-01"],
    ["2026-10-01", "다음 달", "2026-11-01"],
    ["2026-01-01", "이전 달", "2025-12-01"],
    ["2026-12-01", "다음 달", "2027-01-01"],
  ]) {
    const view = harness(month)
    view.buttons.find(button => button.props["aria-label"] === label).props.onClick()
    assert.deepEqual(view.pushes, [{ href: `/admin/schedule?month=${expected}`, scroll: false }])
    assert.deepEqual(view.selections, [null])
  }
})

test("Today navigates to server-selected current month without a full reload", () => {
  const view = harness("2025-12-01")
  view.buttons.find(button => button.props.children === "오늘").props.onClick()
  assert.deepEqual(view.pushes, [{ href: "/admin/schedule", scroll: false }])
})

test("pending navigation disables all month controls and announces loading", () => {
  const view = harness("2026-10-01", true)
  assert.equal(view.buttons.length, 3)
  for (const button of view.buttons) {
    assert.equal(button.props.disabled, true)
    assert.equal(button.props.type, "button")
    assert.match(button.props.className, /min-h-11/)
    button.props.onClick()
  }
  assert.equal(view.pushes.length, 0)
  assert.equal(view.selections.length, 0)
  assert.equal(view.all.find(node => node.props?.role === "status").props.children, "일정을 불러오는 중입니다.")
})

test("new month props render the requested heading and number of dates", () => {
  const view = harness("2028-02-01")
  assert.equal(view.all.find(node => node.type === "h2").props.children.join(""), "2028년 2월")
  assert.equal(view.all.filter(node => node.type === "button").length, 29 + 3)
})
