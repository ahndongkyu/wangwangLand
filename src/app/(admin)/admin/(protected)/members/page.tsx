import type { Metadata } from "next"
import Link from "next/link"

import { listProfiles } from "@/features/members"
import { Pagination } from "@/shared/components/pagination"
import { RoleBadge } from "@/shared/components/role-badge"
import { SearchBox } from "@/shared/components/search-box"
import { EmptyState } from "@/shared/components/empty-state"
import { cn } from "@/shared/lib/utils"
import type { Profile } from "@/features/members"

export const metadata: Metadata = { title: "회원 관리" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 30

const SORT_OPTIONS = [
  { label: "상태순", value: "status" },
  { label: "이름순", value: "name" },
  { label: "가입순", value: "joined" },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]["value"]

const STATUS_LABEL: Record<Profile["status"], string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
}

const STATUS_COLOR: Record<Profile["status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
}

// 헤더와 행이 공유하는 grid 정의
//   sm 이상: 번호 / 닉네임 / 상태 / 권한 / 가입일
//   sm 미만: 번호 / 닉네임 / 가입일
const ROW_GRID =
  "grid grid-cols-[48px_1fr_84px] sm:grid-cols-[48px_minmax(0,1fr)_72px_84px_84px] gap-3 items-center"

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; sort?: string }>
}) {
  const params = await searchParams
  const filterStatus = (params.status ?? "") as Profile["status"] | ""
  const sortRaw = (params.sort ?? "status") as string
  const sort: SortValue = (SORT_OPTIONS.find((o) => o.value === sortRaw)?.value ?? "status") as SortValue
  const activeQuery = (params.q ?? "").trim()
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { profiles, total } = await listProfiles({
    status: filterStatus || undefined,
    sort,
    query: activeQuery || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildHref(next: { status?: string; sort?: string }) {
    const sp = new URLSearchParams()
    const s = next.status ?? filterStatus
    const so = next.sort ?? sort
    if (s) sp.set("status", s)
    if (so && so !== "status") sp.set("sort", so)
    if (activeQuery) sp.set("q", activeQuery)
    const qs = sp.toString()
    return qs ? `/admin/members?${qs}` : "/admin/members"
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">회원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 <span className="font-semibold text-foreground">{total}</span>명 — 회원을 클릭하면 상세 페이지로 이동합니다.
        </p>
      </header>

      {/* 상태 필터 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { label: "전체", value: "" },
          { label: "대기", value: "pending" },
          { label: "승인", value: "approved" },
          { label: "거절", value: "rejected" },
        ].map((f) => (
          <a
            key={f.value}
            href={buildHref({ status: f.value })}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filterStatus === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* 정렬 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">정렬</span>
        {SORT_OPTIONS.map((o) => (
          <a
            key={o.value}
            href={buildHref({ sort: o.value })}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              sort === o.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </a>
        ))}
      </div>

      {/* 검색 */}
      <div className="mb-4 max-w-md">
        <SearchBox placeholder="닉네임 또는 핸드폰번호로 검색" />
      </div>

      {profiles.length === 0 ? (
        <EmptyState title={activeQuery ? `'${activeQuery}' 검색 결과가 없습니다` : "해당하는 회원이 없습니다"} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className={cn(ROW_GRID, "border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground")}>
              <span className="text-center">번호</span>
              <span>닉네임</span>
              <span className="hidden sm:block">상태</span>
              <span className="hidden sm:block">권한</span>
              <span className="text-right">가입일</span>
            </div>
            <ul className="divide-y divide-border">
              {profiles.map((p, i) => {
                const num = total - offset - i
                return (
                  <li key={p.id} className={cn(p.is_banned && "opacity-60")}>
                    <Link
                      href={`/admin/members/${p.id}`}
                      className={cn(ROW_GRID, "px-4 py-3 transition-colors hover:bg-secondary/50")}
                    >
                      <span className="text-center text-xs text-muted-foreground">{num}</span>

                      {/* 닉네임 */}
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {p.nickname}
                        </span>
                        {p.is_banned && (
                          <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            차단
                          </span>
                        )}
                      </span>

                      {/* 상태 */}
                      <span className="hidden sm:block">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            STATUS_COLOR[p.status]
                          )}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </span>

                      {/* 권한 */}
                      <span className="hidden sm:block">
                        <RoleBadge role={p.role} />
                      </span>

                      {/* 가입일 */}
                      <span className="text-right text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("ko-KR", {
                          year: "2-digit",
                          month: "2-digit",
                          day: "2-digit",
                        }).replace(/\.\s*$/, "")}
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
            basePath="/admin/members"
            searchParams={{
              status: filterStatus || undefined,
              sort: sort !== "status" ? sort : undefined,
              q: activeQuery || undefined,
            }}
          />
        </>
      )}
    </div>
  )
}
