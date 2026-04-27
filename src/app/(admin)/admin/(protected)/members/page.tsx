import type { Metadata } from "next"
import { listProfiles, MemberRowActions } from "@/features/members"
import { getCurrentAdmin } from "@/features/auth"
import { Pagination } from "@/shared/components/pagination"

export const metadata: Metadata = { title: "회원 관리" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 30

const SORT_OPTIONS = [
  { label: "상태순", value: "status" },
  { label: "이름순", value: "name" },
  { label: "가입순", value: "joined" },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]["value"]

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; sort?: string }>
}) {
  const params = await searchParams
  const filterStatus = (params.status ?? "") as "pending" | "approved" | "rejected" | ""
  const sortRaw = (params.sort ?? "status") as string
  const sort: SortValue = (SORT_OPTIONS.find((o) => o.value === sortRaw)?.value ?? "status") as SortValue
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const me = await getCurrentAdmin()
  const isTopAdmin = me?.role === "admin"

  const { profiles, total } = await listProfiles({
    status: filterStatus || undefined,
    sort,
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
    const qs = sp.toString()
    return qs ? `/admin/members?${qs}` : "/admin/members"
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">회원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 <span className="font-semibold text-foreground">{total}</span>명
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

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          해당하는 회원이 없습니다.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-border bg-secondary/40 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold w-14">번호</th>
                  <th className="px-4 py-3 font-semibold">닉네임</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">권한</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">가입일</th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <MemberRowActions
                    key={p.id}
                    profile={p}
                    isTopAdmin={isTopAdmin}
                    num={total - offset - i}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/members"
            searchParams={{
              status: filterStatus || undefined,
              sort: sort !== "status" ? sort : undefined,
            }}
          />
        </>
      )}
    </div>
  )
}
