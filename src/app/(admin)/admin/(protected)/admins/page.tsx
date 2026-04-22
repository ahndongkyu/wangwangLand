import { redirect } from "next/navigation"

import { AdminManageRow, getCurrentAdmin } from "@/features/auth"
import { createClient } from "@/shared/lib/supabase/server"
import type { Admin } from "@/shared/types/database"

export const dynamic = "force-dynamic"

export default async function AdminAdminsPage() {
  const me = await getCurrentAdmin()
  if (!me) redirect("/admin/login")
  if (me.role !== "admin") redirect("/admin")

  const supabase = await createClient()
  const { data: admins } = await supabase
    .from("admins")
    .select("*")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })

  const list = (admins ?? []) as Admin[]
  const topAdminCount = list.filter((a) => a.role === "admin").length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          운영진 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          역할 변경과 제거가 가능합니다. 최고관리자는 최소 1명 이상 유지되어야
          하며, 본인 계정은 직접 수정할 수 없습니다.
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-semibold text-foreground">권한 요약</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">최고관리자</span> —
            컨텐츠 작성·수정·삭제, 신청 관리, 운영진 관리 (이 페이지 접근) 전부
            가능
          </li>
          <li>
            <span className="font-semibold text-foreground">관리자</span> —
            컨텐츠 작성·수정, 신청 상태 변경 가능. 삭제·운영진 관리는 불가
          </li>
        </ul>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">신규 운영진 추가</p>
        <p className="mt-1 leading-relaxed">
          신규 계정 추가는 Supabase 대시보드에서 진행해주세요.
          <br />
          1) Authentication → Users → Add user (이메일/비밀번호 생성)
          <br />
          2) Table Editor → admins → Insert row (user_id, email, name, role
          입력)
        </p>
      </section>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-secondary/40 text-left text-sm">
            <tr>
              <th className="px-4 py-3 font-semibold">이름</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">
                이메일
              </th>
              <th className="px-4 py-3 font-semibold">역할</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">
                가입일
              </th>
              <th className="px-4 py-3 text-right font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <AdminManageRow key={a.id} admin={a} currentAdminId={me.id} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        현재 최고관리자 {topAdminCount}명 · 전체 {list.length}명
      </p>
    </div>
  )
}
