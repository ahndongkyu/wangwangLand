import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentAdmin } from "@/features/auth"
import {
  listStaffAvailability,
  listAllStaff,
  StaffScheduleCalendar,
} from "@/features/staff-schedule"

export const metadata: Metadata = { title: "운영진 일정" }
export const dynamic = "force-dynamic"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function getMonthRange(monthStart: string): { start: string; end: string } {
  const [y, m] = monthStart.split("-").map(Number)
  // 캘린더에 보이는 이전달 일부 + 다음달 일부도 포함하기 위해 -7일 ~ +37일
  const startDate = new Date(y, m - 1, 1)
  startDate.setDate(startDate.getDate() - 7)
  const endDate = new Date(y, m, 0) // 마지막날
  endDate.setDate(endDate.getDate() + 7)

  return {
    start: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    end: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`,
  }
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const me = await getCurrentAdmin()
  if (!me) redirect("/admin/login")

  const params = await searchParams
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
  const monthStart = params.month && /^\d{4}-\d{2}-01$/.test(params.month) ? params.month : defaultMonth

  const { start, end } = getMonthRange(monthStart)
  const [items, staff] = await Promise.all([
    listStaffAvailability(start, end),
    listAllStaff(),
  ])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">운영진 일정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          본인 또는 다른 운영진의 출근 일정을 등록해 주세요. 등록된 일정은 봉사자에게 표시됩니다.
        </p>
      </header>

      <StaffScheduleCalendar
        monthStart={monthStart}
        items={items}
        staff={staff}
        currentUserId={me.id}
      />
    </div>
  )
}
