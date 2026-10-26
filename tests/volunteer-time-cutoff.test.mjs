import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
const { getVolunteerTimeOptions, validateVolunteerSchedule } = load("src/features/applications/lib/volunteer-operating-hours.ts")

test("both schedules expose only approved half-hour slots", () => {
  const hours = load("src/features/applications/lib/volunteer-operating-hours.ts")
  const afternoon = ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"]
  const now = new Date("2026-10-01T00:00:00Z")
  assert.deepEqual(Array.from(hours.getVolunteerTimeOptions(["2099-10-10"], now)), ["10:00", "10:30", "11:00", ...afternoon])
  assert.deepEqual(Array.from(hours.getAdoptionTimeOptions(["2099-10-10"], now)), ["11:00", ...afternoon])
  for (const time of ["10:10", "11:30", "12:00", "12:30", "16:10", "16:30", "17:00"]) assert.ok(validateVolunteerSchedule(["2099-10-10"], time, now))
})

test("time dropdowns omit unavailable options and reset 30 minutes when selecting 11 or 16", () => {
  const hours = load("src/features/applications/lib/volunteer-operating-hours.ts")
  const changed = []
  const { VolunteerTimeField } = load("src/features/applications/components/volunteer-time-field.tsx", {
    "../lib/volunteer-operating-hours": hours,
    "@/shared/components/ui/label": { Label: ({ children, ...props }) => React.createElement("label", props, children) },
  })
  const props = { selectedDates: ["2099-10-10"], hour: "13", minute: "30", onHourChange: value => changed.push(value), onMinuteChange: value => changed.push(value) }
  function nodes(node) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)] }
  const hour = nodes(VolunteerTimeField(props)).find(n => n.props?.id === "available_hour")
  for (const target of ["11", "16"]) { hour.props.onChange({ target: { value: target } }); assert.equal(changed.at(-1), "00") }
  for (const hour of ["11", "16", "17"]) {
    const html = renderToStaticMarkup(React.createElement(VolunteerTimeField, { ...props, hour }))
    assert.doesNotMatch(html, /<option[^>]+value="(?:12|17|30|10|20|40|50)"[^>]*disabled/)
    const tree = nodes(VolunteerTimeField({ ...props, hour }))
    const minutes = nodes(tree.find(n => n.props?.id === "available_minute")).filter(n => n.type === "option").map(n => n.props.value)
    assert.deepEqual(minutes, hour === "17" ? [""] : ["", "00"])
    assert.equal(tree.find(n => n.props?.name === "available_time").props.value, "")
  }
})

test("today's volunteer slots exclude the current and past minute in KST", () => {
  const now = new Date("2026-10-08T04:30:00Z")
  assert.match(validateVolunteerSchedule(["2026-10-08"], "13:00", now), /지난 시간/)
  assert.match(validateVolunteerSchedule(["2026-10-08"], "13:30", now), /지난 시간/)
  assert.equal(validateVolunteerSchedule(["2026-10-08"], "14:00", now), null)
  assert.equal(getVolunteerTimeOptions(["2026-10-08"], now)[0], "14:00")
  assert.equal(getVolunteerTimeOptions(["2026-10-08", "2026-10-09"], now)[0], "14:00")
  assert.equal(getVolunteerTimeOptions(["2026-10-09"], now)[0], "10:00")
})

test("final 16:00 slot closes at exactly 16:00 and KST date rollover remains valid", () => {
  assert.equal(validateVolunteerSchedule(["2026-10-08"], "16:00", new Date("2026-10-08T06:59:59Z")), null)
  assert.equal(getVolunteerTimeOptions(["2026-10-08"], new Date("2026-10-08T07:00:00Z")).length, 0)
  assert.match(validateVolunteerSchedule(["2026-10-08"], "16:00", new Date("2026-10-08T15:00:00Z")), /지난 날짜/)
  assert.equal(validateVolunteerSchedule(["2026-10-09"], "10:00", new Date("2026-10-08T15:00:00Z")), null)
})
