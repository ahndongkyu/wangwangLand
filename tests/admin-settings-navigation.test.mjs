import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { load } from "./helpers/page-review-fixtures.mjs"
import { operatingSnapshot } from "./helpers/operating-fixture.mjs"

const route = "src/app/(admin)/admin/(protected)/settings/[section]/page.tsx"
function fixture(role = "admin") {
  const calls = []
  const component = name => props => React.createElement("div", { "data-section": props.section }, name)
  const Page = load(route, {
    "next/navigation": { notFound() { throw Error("404") } },
    "@/features/auth": { getCurrentAdmin: async () => role ? { role } : null },
    "@/features/settings/api/operating-queries": { getOperatingInfo: async () => { calls.push("operating"); return operatingSnapshot } },
    "@/features/settings/components/operating-manager": { OperatingManager: component("operating") },
    "@/features/settings/api/homepage-queries": { getHomepageSettings: async () => { calls.push("photos"); return { photos: {}, autoFill: true, error: null } }, getManagedAnimals: async () => { calls.push("animals"); return [] } },
    "@/features/settings/components/homepage-manager": { HomepageManager: component("homepage") },
    "@/features/settings/api/popup-queries": { getAdminPopups: async () => { calls.push("popups"); return { popups: [], error: null } } },
    "@/features/settings/components/popup-manager": { PopupManager: component("popups") },
    "@/features/settings/api/queries": { getMaintenanceConfig: async () => { calls.push("maintenance"); return { enabled: false, message: "", eta: null } } },
    "../maintenance-settings": { MaintenanceSettings: component("maintenance") },
  }).default
  return { calls, render: async section => renderToStaticMarkup(await Page({ params: Promise.resolve({ section }) })) }
}
test("settings routes isolate data loading and select correct form", async () => {
  for (const [section, expected] of Object.entries({ photos: ["photos"], animals: ["photos", "animals"], popups: ["popups"], delivery: ["operating"], contact: ["operating"], account: ["operating"], maintenance: ["maintenance"] })) {
    const f = fixture(); const html = await f.render(section)
    assert.deepEqual(f.calls, expected)
    assert.match(html, /<h1/)
    if (["photos", "animals", "delivery", "contact", "account"].includes(section)) assert.ok(html.includes(`data-section="${section}"`))
  }
})
test("maintenance enforces administrator permission and unknown routes are rejected before queries", async () => {
  for (const [role, section] of [["staff", "maintenance"], [null, "delivery"], ["admin", "unknown"], ["admin", "constructor"]]) {
    const f = fixture(role); await assert.rejects(f.render(section), /404/); assert.deepEqual(f.calls, [])
  }
  await fixture("staff").render("delivery")
})
