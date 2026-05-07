import { redirect } from "next/navigation"

import { AdminManageRow, getCurrentAdmin } from "@/features/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import type { Profile } from "@/features/members/api/queries"

export const dynamic = "force-dynamic"

export default async function AdminAdminsPage() {
  const me = await getCurrentAdmin()
  if (!me) redirect("/admin/login")
  if (me.role !== "admin") redirect("/admin")

  const adminClient = createAdminClient()
  const { data: staffList } = await adminClient
    .from("profiles")
    .select("id, nickname, avatar_url, phone, role, status, is_banned, created_at, terms_agreed_at, terms_version, privacy_agreed_at, privacy_version, marketing_agreed_at")
    .in("role", ["staff", "admin"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })

  const list = (staffList ?? []) as Profile[]
  const adminCount = list.filter((p) => p.role === "admin").length
  const staffCount = list.filter((p) => p.role === "staff").length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">운영진 관리</h1>
          <div className="mt-1.5 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">전체 {list.length}명</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              관리자 {adminCount}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              운영진 {staffCount}
            </span>
          </div>
        </div>
      </header>

      {/* 안내 박스 (압축) */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground space-y-3">
        <div>
          <span className="font-semibold text-foreground">권한 요약 — </span>
          <span className="font-semibold text-foreground">관리자</span>
          {": "}컨텐츠·신청·운영진 관리 전부 가능 ·{" "}
          <span className="font-semibold text-foreground">운영진</span>
          {": "}컨텐츠 작성·수정, 신청 상태 변경 가능 (삭제·운영진 관리 불가)
        </div>
        <div>
          <span className="font-semibold text-foreground">신규 추가 — </span>
          회원 관리에서 해당 회원의 역할을 <span className="font-semibold text-foreground">운영진</span> 또는{" "}
          <span className="font-semibold text-foreground">관리자</span>로 변경하면 즉시 이 페이지에 표시됩니다.
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[480px]">
          <thead className="border-b border-border bg-secondary/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">닉네임</th>
              <th className="px-4 py-3">역할</th>
              <th className="hidden px-4 py-3 md:table-cell">가입일</th>
              <th className="px-4 py-3 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <AdminManageRow key={p.id} profile={p} currentProfileId={me.id} />
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  운영진이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
