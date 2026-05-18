import Link from "next/link"
import { ChevronRight } from "lucide-react"

import {
  listAdoptionApplications,
  listVolunteerApplications,
} from "@/features/applications"
import { EmptyState } from "@/shared/components/empty-state"
import { Pagination } from "@/shared/components/pagination"
import { Badge } from "@/shared/components/ui/badge"
import { formatKoreanPhone } from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const TYPE_TABS = [
  { value: "volunteer", label: "봉사 신청" },
  { value: "adoption", label: "입양 신청" },
] as const

const STATUS_FILTERS: Array<{ label: string; value: ApplicationStatus | "전체" }> = [
  { label: "전체", value: "전체" },
  { label: "접수", value: "접수" },
  { label: "검토중", value: "검토중" },
  { label: "승인", value: "승인" },
  { label: "반려", value: "반려" },
  { label: "취소", value: "취소" },
]

type TypeValue = (typeof TYPE_TABS)[number]["value"]

function parseType(value: string | undefined): TypeValue {
  return value === "adoption" ? "adoption" : "volunteer"
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
    case "취소":
      return "bg-muted text-muted-foreground/60"
  }
}

function statusBorderColor(status: ApplicationStatus) {
  switch (status) {
    case "접수":
      return "border-l-primary"
    case "검토중":
      return "border-l-amber-400"
    case "승인":
      return "border-l-emerald-500"
    case "반려":
      return "border-l-muted-foreground/40"
    case "취소":
      return "border-l-muted-foreground/20"
  }
}

interface BuildOpts {
  type?: TypeValue
  status?: ApplicationStatus | "전체"
  q?: string
  from?: string
  to?: string
  page?: number
}

function buildHref({
  type = "volunteer",
  status = "전체",
  q = "",
  from,
  to,
  page,
}: BuildOpts) {
  const qs = new URLSearchParams()
  qs.set("type", type)
  if (status !== "전체") qs.set("status", String(status))
  if (q) qs.set("q", q)
  // from/to를 명시적으로 넘기면 빈 문자열이라도 URL에 포함 (전체 기간 구분용)
  if (from !== undefined) qs.set("from", from.trim())
  if (to !== undefined) qs.set("to", to.trim())
  if (page && page > 1) qs.set("page", String(page))
  return `/admin/applications?${qs.toString()}`
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    status?: string
    q?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const params = await searchParams

  // KST 기준 이번 달 1일 ~ 말일 (YYYY-MM-DD)
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayKST = nowKst.toISOString().slice(0, 10)
  const monthStartKST = `${nowKst.toISOString().slice(0, 7)}-01`
  // 다음 달 0일 = 이번 달 말일
  const monthEndDate = new Date(
    Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth() + 1, 0)
  )
  const monthEndKST = monthEndDate.toISOString().slice(0, 10)

  const activeType = parseType(params.type)
  const activeStatus = parseStatus(params.status)
  const activeQuery = (params.q ?? "").trim()
  // from/to가 URL에 없으면 이번 달 전체 범위가 기본값. 빈 문자열이면 전체 기간.
  const activeFrom =
    params.from !== undefined ? params.from.trim() : monthStartKST
  const activeTo = params.to !== undefined ? params.to.trim() : monthEndKST
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const commonOpts = {
    status: activeStatus,
    query: activeQuery || undefined,
    from: activeFrom || undefined,
    to: activeTo || undefined,
    limit: PAGE_SIZE,
    offset,
  }

  const adoption =
    activeType === "adoption"
      ? await listAdoptionApplications(commonOpts)
      : { rows: [], total: 0 }

  const volunteer =
    activeType === "volunteer"
      ? await listVolunteerApplications(commonOpts)
      : { rows: [], total: 0 }

  const current = activeType === "adoption" ? adoption : volunteer
  const totalPages = Math.max(1, Math.ceil(current.total / PAGE_SIZE))

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
            href={buildHref({ type: tab.value, status: activeStatus })}
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

      {/* 검색 + 날짜 범위 (GET form — 페이지 1부터 다시 표시) */}
      <form
        action="/admin/applications"
        method="get"
        className="mb-4 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1.5fr_1fr_1fr_auto]"
      >
        <input type="hidden" name="type" value={activeType} />
        {activeStatus !== "전체" && (
          <input type="hidden" name="status" value={activeStatus} />
        )}
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          이름·전화번호
          <input
            type="text"
            name="q"
            defaultValue={activeQuery}
            placeholder="예: 홍길동 또는 010"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          시작일
          <input
            type="date"
            name="from"
            defaultValue={activeFrom}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          종료일
          <input
            type="date"
            name="to"
            defaultValue={activeTo}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-9 flex-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:flex-none"
          >
            검색
          </button>
          <Link
            href={buildHref({
              type: activeType,
              status: activeStatus,
              from: todayKST,
              to: todayKST,
            })}
            className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            오늘
          </Link>
          <Link
            href={buildHref({ type: activeType, status: activeStatus })}
            className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            이번 달
          </Link>
          <Link
            href={buildHref({
              type: activeType,
              status: activeStatus,
              from: "",
              to: "",
            })}
            className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            전체 기간
          </Link>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">상태</span>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildHref({
              type: activeType,
              status: f.value,
              q: activeQuery,
              from: activeFrom,
              to: activeTo,
            })}
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
        <EmptyState title="해당 조건의 신청이 없습니다" />
      ) : activeType === "adoption" ? (
        <>
          {/* 모바일 카드 리스트 */}
          <div className="md:hidden divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {adoption.rows.map((item) => (
              <Link key={item.id} href={`/admin/applications/adoption/${item.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 border-l-4 ${statusBorderColor(item.status)}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.applicant_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatKoreanPhone(item.phone)} · {new Date(item.submitted_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn("border-0 font-semibold text-xs", statusBadgeColor(item.status))}>
                    {item.status}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full md:min-w-[520px]">
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
                  <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">작업</th>
                </tr>
              </thead>
              <tbody>
                {adoption.rows.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30"
                  >
                    <td className={`px-4 py-3 font-medium border-l-4 ${statusBorderColor(a.status)}`}>
                      <Link
                        href={`/admin/applications/adoption/${a.id}`}
                        className="block hover:text-primary"
                      >
                        {a.applicant_name}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                      {formatKoreanPhone(a.phone)}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                      {a.dog?.name ?? a.cat?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/applications/adoption/${a.id}`}
                        className="inline-block"
                      >
                        <Badge
                          className={cn(
                            "border-0 font-semibold",
                            statusBadgeColor(a.status)
                          )}
                        >
                          {a.status}
                        </Badge>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {new Date(a.submitted_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short", hour12: false })}
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
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
        </>
      ) : (
        <>
          {/* 모바일 카드 리스트 */}
          <div className="md:hidden divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {volunteer.rows.map((item) => (
              <Link key={item.id} href={`/admin/applications/volunteer/${item.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 border-l-4 ${statusBorderColor(item.status)}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.applicant_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatKoreanPhone(item.phone)} · {new Date(item.submitted_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn("border-0 font-semibold text-xs", statusBadgeColor(item.status))}>
                    {item.status}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full md:min-w-[520px]">
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
                  <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">작업</th>
                </tr>
              </thead>
              <tbody>
                {volunteer.rows.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30"
                  >
                    <td className={`px-4 py-3 font-medium border-l-4 ${statusBorderColor(v.status)}`}>
                      <Link
                        href={`/admin/applications/volunteer/${v.id}`}
                        className="block hover:text-primary"
                      >
                        {v.applicant_name}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                      {v.party_size}명
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                      {formatKoreanPhone(v.phone)}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                      {v.activities.join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/applications/volunteer/${v.id}`}
                        className="inline-block"
                      >
                        <Badge
                          className={cn(
                            "border-0 font-semibold",
                            statusBadgeColor(v.status)
                          )}
                        >
                          {v.status}
                        </Badge>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {new Date(v.submitted_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short", hour12: false })}
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
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
        </>
      )}

      <Pagination
        currentPage={pageNum}
        totalPages={totalPages}
        basePath="/admin/applications"
        searchParams={{
          type: activeType,
          status: activeStatus !== "전체" ? activeStatus : undefined,
          q: activeQuery || undefined,
          from: activeFrom || undefined,
          to: activeTo || undefined,
        }}
      />
    </div>
  )
}
