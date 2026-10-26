import fs from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load, renderHome } from "./page-review-fixtures.mjs"
import { operatingSnapshot } from "./operating-fixture.mjs"

const button = ({ children, variant, ...props }) => React.createElement("button", { ...props, className: "min-h-11 rounded-lg border border-border px-4 " + (variant === "outline" ? "bg-card text-foreground" : "bg-primary text-primary-foreground") }, children)
const copy = ({ value, textLabel, label }) => React.createElement("button", { className: "min-h-11 rounded-lg border border-border bg-card px-3", "data-value": value }, textLabel || label)
const Card = load("src/features/settings/components/delivery-card.tsx", { "@/shared/components/copy-button": { CopyButton: copy } }).DeliveryCard
const Manager = load("src/features/settings/components/operating-manager.tsx", {
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "@/shared/components/toast": { useToast: () => ({ success() {}, error() {} }) },
  "@/shared/components/ui/button": { Button: button }, "./delivery-card": { DeliveryCard: Card },
  "../api/operating-actions": {},
}).OperatingManager
const css = fs.readdirSync(".next/static/css").filter(file => file.endsWith(".css")).map(file => fs.readFileSync(`.next/static/css/${file}`, "utf8")).join("\n")
const wrap = content => `<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body class="bg-background text-foreground"><main class="mx-auto max-w-4xl p-4 sm:p-8">${content}</main></body></html>`
fs.mkdirSync("/private/tmp/operating-ui", { recursive: true })
fs.writeFileSync("/private/tmp/operating-ui/admin.html", wrap(renderToStaticMarkup(React.createElement(Manager, { initial: operatingSnapshot }))))
fs.writeFileSync("/private/tmp/operating-ui/home.html", wrap(await renderHome()))
