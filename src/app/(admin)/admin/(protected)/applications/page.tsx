import Link from "next/link"

import {
  listAdoptionApplications,
  listVolunteerApplications,
} from "@/features/applications"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const TYPE_TABS = [
  { value: "adoption", label: "입양 신청" },
  { value: "volunteer", label: "봉사 신청" },
] as const

const STATUS_FILTERS: Array<{ label: string; value: ApplicationStatus | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "접수", value: "접수" },
  { label: "검토중", value: "검토중" },
  { label: "승인", value: "승인" },
  { label: "반려", value: "반려" },
]

type TypeValue = (typeof TYPE_TABS)[number]["value"]

function parseType(value: string | undefined): TypeValue {
  return value === "volunteer" ? "volunteer" : "adoption"
}

function parseStatus(
  value: string | undefined
): ApplicationStatus | "전체" {
  if (!value) return "전체"
  const found = STATUS_FILTERS.find((f) => f.value === value)
  return found ? found.value : "전체"
}

function statusBadgeColor(status: ApplicationStatus) {
  switch (status) {
    case "접수":
      return "bg-primary/20 text-primary"
    case "검토중":
      return "bg-amber-500/20 text-amber-700"
    case "승인":
      return "bg-emerald-600/20 text-emerald-700"
    case "반려":
      return "bg-muted text-muted-foreground"
  }
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>
}) {
  const params = await searchParams
  const activeType = parseType(params.type)
  const activeStatus = parseStatus(params.status)

  const adoption =
    activeType === "adoption"
      ? await listAdoptionApplications({
          status: activeStatus,
          limit: PAGE_SIZE,
        })
      : { rows: [], total: 0 }

  const volunteer =
    activeType === "volunteer"
      ? await listVolunteerApplications({
          status: activeStatus,
          limit: PAGE_SIZE,
        })
      : { rows: [], total: 0 }

  const current =
    activeType === "adoption" ? adoption : volunteer

  function buildHref(type: TypeValue, status: string) {
    const qs = new URLSearchParams()
    qs.set("type", type)
    if (status !== "전체") qs.set("status", status)
    return `/admin/applications?${qs.toString()}`
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          신청 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          입양·봉사 신청의 상태를 변경하고 운영 메모를 기록할 수 있습니다.
        </p>
      </header>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref(tab.value, String(activeStatus))}
            className={cn(
              "relative px-4 py-2 text-sm font-semibold transition-colors",
              tab.value === activeType
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.value === activeType && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">상태</span>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildHref(activeType, String(f.value))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeStatus === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:bg-secondary"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        총 <span className="font-bold text-foreground">{current.total}</span>건
      </p>

      {current.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          해당 조건의 신청이 없습니다.
        </div>
      ) : activeType === "adoption" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/40 text-left text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">신청자</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  연락처
                </th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                  대상 아이
                </th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  신청일시
                </th>
                <th className="px-4 py-3 text-right font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {adoption.rows.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{a.applicant_name}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {a.phone}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {a.dog?.name ?? a.cat?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 font-semibold",
                        statusBadgeColor(a.status)
                      )}
                    >
                      {a.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {new Date(a.submitted_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/applications/adoption/${a.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      열기 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary/40 text-left text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">신청자</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  인원
                </th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  연락처
                </th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                  희망 활동
                </th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  신청일시
                </th>
                <th className="px-4 py-3 text-right font-semibold">작업</th>
              </tr>
            </thead>
            <tbody>
              {volunteer.rows.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{v.applicant_name}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {v.party_size}명
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {v.phone}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {v.activities.join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 font-semibold",
                        statusBadgeColor(v.status)
                      )}
                    >
                      {v.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {new Date(v.submitted_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/applications/volunteer/${v.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      열기 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
