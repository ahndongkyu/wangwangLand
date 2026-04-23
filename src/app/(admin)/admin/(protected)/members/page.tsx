import type { Metadata } from "next"
import { listProfiles, MemberRowActions } from "@/features/members"
import { Pagination } from "@/shared/components/pagination"

export const metadata: Metadata = { title: "회원 관리" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 30

const STATUS_LABEL = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
} as const

const STATUS_COLOR = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
} as const

const ROLE_LABEL = {
  member: "일반회원",
  full_member: "정회원",
  staff: "운영진",
} as const

const ROLE_COLOR = {
  member: "bg-secondary text-muted-foreground",
  full_member: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  staff: "bg-primary/15 text-primary",
} as const

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}) {
  const params = await searchParams
  const filterStatus = (params.status ?? "") as "pending" | "approved" | "rejected" | ""
  const pageNum = Math.max(1, Number(params.page ?? 1) || 1)
  const offset = (pageNum - 1) * PAGE_SIZE

  const { profiles, total } = await listProfiles({
    status: filterStatus || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filterHref = (s: string) =>
    s ? `/admin/members?status=${s}` : "/admin/members"

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">회원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 <span className="font-semibold text-foreground">{total}</span>명
        </p>
      </header>

      {/* 상태 필터 */}
      <div className="mb-4 flex gap-2">
        {[
          { label: "전체", value: "" },
          { label: "대기", value: "pending" },
          { label: "승인", value: "approved" },
          { label: "거절", value: "rejected" },
        ].map((f) => (
          <a
            key={f.value}
            href={filterHref(f.value)}
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

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          해당하는 회원이 없습니다.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/40 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">닉네임</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">권한</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">밴</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">가입일</th>
                  <th className="px-4 py-3 text-right font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 ${p.is_banned ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.avatar_url && (
                          <img
                            src={p.avatar_url}
                            alt={p.nickname}
                            className="size-7 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium text-foreground">{p.nickname}</span>
                        {p.is_banned && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            BAN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLOR[p.role]}`}>
                        {ROLE_LABEL[p.role]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.is_banned
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {p.is_banned ? "밴" : "정상"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MemberRowActions profile={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath="/admin/members"
            searchParams={{ status: filterStatus || undefined }}
          />
        </>
      )}
    </div>
  )
}
