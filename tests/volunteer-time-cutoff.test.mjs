import test from "node:test"
import assert from "node:assert/strict"
import { load } from "./helpers/page-review-fixtures.mjs"
const { getVolunteerTimeOptions, validateVolunteerSchedule } = load("src/features/applications/lib/volunteer-operating-hours.ts")

test("today's volunteer slots exclude the current and past minute in KST", () => {
  const now = new Date("2026-10-08T04:10:00Z")
  assert.match(validateVolunteerSchedule(["2026-10-08"], "13:00", now), /지난 시간/)
  assert.match(validateVolunteerSchedule(["2026-10-08"], "13:10", now), /지난 시간/)
  assert.equal(validateVolunteerSchedule(["2026-10-08"], "13:20", now), null)
  assert.equal(getVolunteerTimeOptions(["2026-10-08"], now)[0], "13:20")
  assert.equal(getVolunteerTimeOptions(["2026-10-08", "2026-10-09"], now)[0], "13:20")
  assert.equal(getVolunteerTimeOptions(["2026-10-09"], now)[0], "10:00")
})

test("final 17:00 slot closes at exactly 17:00 and KST date rollover remains valid", () => {
  assert.equal(validateVolunteerSchedule(["2026-10-08"], "17:00", new Date("2026-10-08T07:59:59Z")), null)
  assert.equal(getVolunteerTimeOptions(["2026-10-08"], new Date("2026-10-08T08:00:00Z")).length, 0)
  assert.match(validateVolunteerSchedule(["2026-10-08"], "17:00", new Date("2026-10-08T15:00:00Z")), /지난 날짜/)
  assert.equal(validateVolunteerSchedule(["2026-10-09"], "10:00", new Date("2026-10-08T15:00:00Z")), null)
})
