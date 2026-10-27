import fs from "node:fs"
import path from "node:path"
import { renderDashboard } from "./dashboard-fixture.mjs"

// 실제 페이지 컴포넌트를 예시 데이터로 렌더링하는 로컬 시각 검증용 파일.
const cssFiles = fs.readdirSync(".next/static", { recursive: true }).filter(file => file.endsWith(".css"))
const css = cssFiles.map(file => fs.readFileSync(path.join(".next/static", file), "utf8")).join("\n")
if (!css) throw Error("먼저 production build를 실행해 주세요.")
const output = "/private/tmp/dashboard-review"
fs.mkdirSync(output, { recursive: true })
if (!fs.existsSync(`${output}/images`)) fs.symlinkSync(path.resolve("public/images"), `${output}/images`)
for (const [name, options] of [["index", {}], ["empty", { empty: true }], ["error", { stats: null, fail: true }], ["previous", { params: { ym: "2025-01" } }]]) {
  const { html } = await renderDashboard(options)
  fs.writeFileSync(`${output}/${name}.html`, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>운영 대시보드 화면 검증</title><style>${css}</style></head><body class="bg-background text-foreground"><div data-admin-scope><main class="mx-auto w-full min-w-0 max-w-5xl pb-24 md:px-6 md:py-6">${html}</main></div></body></html>`)
}
console.log(output)
