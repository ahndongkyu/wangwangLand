import type { CalendarEvent } from "../types"

/** 봉사 신청에서 자동으로 복사된 과거 활동 항목만 화면에서 제외합니다. */
export function eventDescriptionForDisplay(event: Pick<CalendarEvent, "description" | "source_application_type">) {
  if (event.source_application_type !== "volunteer") return event.description
  return event.description?.split(/\r?\n/)
    .filter(line => !/^\s*희망\s*활동\s*[:：]/.test(line))
    .join("\n").trim() || null
}
