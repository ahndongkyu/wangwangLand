import fs from "node:fs"
import path from "node:path"
import { renderMembers, renderMemberDetail, renderCalendar } from "./page-review-fixtures.mjs"
import { renderLogScreen } from "./mobile-detail-fixture.mjs"

const output = "/private/tmp/mobile-actual"
fs.mkdirSync(output, { recursive: true })
const css = fs.readdirSync(".next/static", { recursive: true }).filter(file => file.endsWith(".css")).map(file => fs.readFileSync(path.join(".next/static", file), "utf8")).join("\n")
const wrap = (html, script = "") => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="bg-background text-foreground"><div data-admin-scope><main class="mx-auto min-w-0 max-w-6xl pb-24">${html}</main></div>${script}</body></html>`
for (const kind of ["sms", "logs"]) for (const detail of [false, true]) {
  const { html } = await renderLogScreen(kind, { detail })
  fs.writeFileSync(`${output}/${kind}${detail ? "-detail" : ""}.html`, wrap(html))
}
fs.writeFileSync(`${output}/members.html`, wrap(await renderMembers()))
fs.writeFileSync(`${output}/member.html`, wrap(await renderMemberDetail()))
for (const section of ["applications", "posts", "donations", "agreements", "manage"]) fs.writeFileSync(`${output}/member-${section}.html`, wrap(await renderMemberDetail({ section })))
fs.writeFileSync(`${output}/calendar.html`, wrap(renderCalendar()))
fs.writeFileSync(`${output}/applications.html`, wrap('<div id="app"></div>', '<script src="/mobile-actual/bundle.js"></script>'))
console.log(output)
