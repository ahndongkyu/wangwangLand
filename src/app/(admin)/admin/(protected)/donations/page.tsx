import Link from "next/link"

import {
  listDonations,
  getDonationStats,
  DonationStatusBadge,
} from "@/features/donations"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { formatShortDate } from "@/shared/lib/utils"
import type { DonationStatus, DonationType } from "@/shared/types/database"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const STATUS_TABS: Array<{ label: string; value: DonationStatus | "" }> = [
  { label: "전체", value: "" },
  { label: "검토중", value: "pending" },
  { label: "기록완료", value: "approved" },
  { label: "반려", value: "rejected" },
]

const TYPE_TABS: Array<{ label: string; value: DonationType | "" }> = [
  { label: "전체", value: "" },
  { label: "현금", value: "cash" },
  { label: "물품", value: "goods" },
]

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string; q?: string }>
}) {
  const params = await searchParams
  const filterStatus = (params.status ?? "") as DonationStatus | ""
  const filterType = (params.type ?? "") as DonationType | ""
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const [{ donations, total }, stats] = await Promise.all([
    listDonations({
      status: filterStatus || undefined,
      type: filterType || undefined,
      query: activeQuery || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getDonationStats(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildHref(next: { status?: string; type?: string }) {
    const sp = new URLSearchParams()
    const s = next.status ?? filterStatus
    const t = next.type ?? filterType
    if (s) sp.set("status", s)
    if (t) sp.set("type", t)
    const qs = sp.toString()
    return qs ? `/admin/donations?${qs}` : "/admin/donations"
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">후원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 <span className="font-semibold text-foreground">{total}</span>건
        </p>
      </header>

      {/* 통계 */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="기록완료 현금 총액" value={`${stats.approvedCashTotal.toLocaleString()}원`} />
        <Stat label="기록완료 물품" value={`${stats.approvedGoodsCount}건`} />
        <Stat label="기록완료 합계" value={`${stats.approvedCount}건`} />
        <Stat label="검토중" value={`${stats.pendingCount}건`} highlight={stats.pendingCount > 0} />
      </section>

      {/* 상태/타입 필터 */}
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-muted-foreground">상태</span>
        {STATUS_TABS.map((t) => (
          <a
            key={t.value}
            href={buildHref({ status: t.value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-muted-foreground">종류</span>
        {TYPE_TABS.map((t) => (
          <a
            key={t.value}
            href={buildHref({ type: t.value })}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              filterType === t.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mb-4 max-w-md">
        <SearchBox placeholder="이름으로 검색" />
      </div>

      {donations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          {activeQuery ? `'${activeQuery}' 검색 결과가 없습니다.` : "후원 내역이 없습니다."}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[56px_1fr_auto_auto_90px] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <span className="text-center">번호</span>
              <span>후원자 / 내용</span>
              <span className="hidden text-right sm:block">상태</span>
              <span className="hidden text-right sm:block">종류</span>
              <span className="text-right">후원일</span>
            </div>
            <ul className="divide-y divide-border">
              {donations.map((d, i) => {
                const num = total - offset - i
                const summary =
                  d.type === "cash"
                    ? `${(d.amount ?? 0).toLocaleString()}원`
                    : [d.item_description, d.item_quantity].filter(Boolean).join(" · ")
                return (
                  <li key={d.id}>
                    <Link
                      href={`/admin/donations/${d.id}`}
                      className="grid grid-cols-[56px_1fr_auto_auto_90px] items-center gap-2 px-4 py-3.5 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-center text-xs text-muted-foreground">{num}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {d.donor_name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {summary}
                        </span>
                      </span>
                      <span className="hidden text-right sm:block">
                        <DonationStatusBadge status={d.status} />
                      </span>
                      <span className="hidden text-right text-xs text-muted-foreground sm:block">
                        {d.type === "cash" ? "현금" : "물품"}
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        {formatShortDate(d.donated_at)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/donations"
            searchParams={{
              status: filterStatus || undefined,
              type: filterType || undefined,
              q: activeQuery || undefined,
            }}
          />
        </>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${highlight ? "border-primary" : "border-border"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}
