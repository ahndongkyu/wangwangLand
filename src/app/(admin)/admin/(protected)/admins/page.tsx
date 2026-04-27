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
    .select("id, nickname, avatar_url, role, status, is_banned, created_at")
    .in("role", ["staff", "admin"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })

  const list = (staffList ?? []) as Profile[]
  const topAdminCount = list.filter((p) => p.role === "admin").length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">운영진 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          역할 변경과 제거가 가능합니다. 관리자는 최소 1명 이상 유지되어야 합니다.
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-semibold text-foreground">권한 요약</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">관리자</span> —
            컨텐츠 작성·수정·삭제, 신청 관리, 운영진 관리 전부 가능
          </li>
          <li>
            <span className="font-semibold text-foreground">운영진</span> —
            컨텐츠 작성·수정, 신청 상태 변경 가능. 삭제·운영진 관리는 불가
          </li>
        </ul>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">신규 운영진 추가</p>
        <p className="mt-1 leading-relaxed">
          카카오로 가입한 회원을 운영진으로 추가하려면:
          <br />
          1) 회원 관리 페이지에서 해당 회원 찾기
          <br />
          2) 역할을 <span className="font-semibold text-foreground">운영진</span> 또는{" "}
          <span className="font-semibold text-foreground">관리자</span>로 변경
          <br />
          → 변경 즉시 이 페이지에 표시되며 관리자 페이지 접근이 가능해집니다.
        </p>
      </section>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[480px]">
          <thead className="border-b border-border bg-secondary/40 text-left text-sm">
            <tr>
              <th className="px-4 py-3 font-semibold">닉네임</th>
              <th className="px-4 py-3 font-semibold">역할</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">가입일</th>
              <th className="px-4 py-3 text-right font-semibold">작업</th>
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

      <p className="mt-4 text-xs text-muted-foreground">
        관리자 {topAdminCount}명 · 전체 {list.length}명
      </p>
    </div>
  )
}
