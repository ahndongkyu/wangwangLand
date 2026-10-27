import "server-only"
import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import { previousMonthSameTimeWindow, recentMonthWindows } from "@/shared/lib/month-windows"
import { recordOperationError } from "@/features/operation-logs/server"
import type { ApplicationStatusCounts } from "./queries"

export async function getDashboardStats(now = new Date()) {
  const auth = await requireAdmin()
  if (!auth.ok) throw new Error("관리자 권한이 필요합니다.")
  const client = await createClient()
  const statuses = ["접수", "검토중", "승인", "일정변경요청", "반려", "취소"] as const
  try {
    const countStatus = async (table: "volunteer_applications" | "adoption_applications") => {
      const counts = await Promise.all(statuses.map(async status => {
        const { count, error } = await client.from(table).select("id", { count: "exact", head: true })
          .eq("status", status).lte("submitted_at", now.toISOString())
        if (error) throw error
        return count ?? 0
      }))
      return { ...Object.fromEntries(statuses.map((status, i) => [status, counts[i]])), total: counts.reduce((a, b) => a + b, 0) } as ApplicationStatusCounts
    }
    const previousWindow = previousMonthSameTimeWindow(now)
    const [volunteer, adoption, monthly, previousCounts] = await Promise.all([
      countStatus("volunteer_applications"), countStatus("adoption_applications"),
      Promise.all(recentMonthWindows(5, now).map(async window => {
        const counts = await Promise.all((["volunteer_applications", "adoption_applications"] as const).map(async table => {
          const { count, error } = await client.from(table).select("id", { count: "exact", head: true })
            .gte("submitted_at", window.from).lt("submitted_at", window.to).lte("submitted_at", now.toISOString())
          if (error) throw error
          return count ?? 0
        }))
        return { month: window.month, label: window.label, volunteer: counts[0], adoption: counts[1] }
      })),
      Promise.all((["volunteer_applications", "adoption_applications"] as const).map(async table => {
        const { count, error } = await client.from(table).select("id", { count: "exact", head: true })
          .gte("submitted_at", previousWindow.from).lte("submitted_at", previousWindow.until)
        if (error) throw error
        return count ?? 0
      })),
    ])
    const compare = (current: number, previous: number) => ({
      current, previous,
      percent: previous === 0 ? null : Math.round((current - previous) / previous * 1000) / 10,
    })
    const currentMonth = monthly[monthly.length - 1]
    const comparison = {
      asOf: now.toISOString(), previousUntil: previousWindow.until, cappedAtMonthEnd: previousWindow.cappedAtMonthEnd,
      volunteer: compare(currentMonth.volunteer, previousCounts[0]),
      adoption: compare(currentMonth.adoption, previousCounts[1]),
    }
    return { volunteer, adoption, monthly, comparison }
  } catch (error) {
    await recordOperationError("query", "getDashboardStats", error, "admin")
    throw new Error("신청 통계를 불러오지 못했습니다.", { cause: error })
  }
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>
