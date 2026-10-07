import Image from "next/image"
import Link from "next/link"
import { User } from "lucide-react"
import { formatKoreanPhone } from "@/shared/lib/validation"
import { formatShortDate } from "@/shared/lib/utils"
import type { Profile } from "../api/queries"

interface Props {
  profiles: Profile[]
  isTopAdmin: boolean
  returnHref?: string
}

export function AdminMembersTable({ profiles, returnHref = "/admin/members" }: Props) {
  const roles = { member: "회원", staff: "운영진", admin: "관리자" }
  const statuses = { pending: "가입 미완료", approved: "정상", rejected: "거절" }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_130px_100px_70px_80px_70px] items-center gap-3 rounded-t-xl border-b border-border bg-muted/40 px-5 py-3 text-xs font-semibold text-muted-foreground xl:grid">
        <span>회원</span><span>연락처</span><span>이용 상태</span><span>권한</span><span>가입일</span><span className="text-right">관리</span>
      </div>
      <ul className="divide-y divide-border">
        {profiles.map(p => <li key={p.id}>
          <Link href={`/admin/members/${p.id}?${new URLSearchParams({ returnTo: returnHref })}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring sm:p-5 xl:grid-cols-[minmax(0,1fr)_130px_100px_70px_80px_70px]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">{p.avatar_url ? <Image src={p.avatar_url} alt="" fill sizes="40px" className="object-cover" /> : <User aria-hidden className="size-full p-2 text-muted-foreground" />}</div>
              <div className="min-w-0"><p title={p.nickname} className="truncate text-sm font-semibold">{p.nickname}</p><p className="mt-1 text-xs text-muted-foreground xl:hidden">{roles[p.role]} · 가입 {formatShortDate(p.created_at)}</p></div>
            </div>
            <span className="min-w-0 row-start-2 text-sm tabular-nums text-muted-foreground xl:col-span-1 xl:row-auto">{p.phone ? formatKoreanPhone(p.phone) : "연락처 미등록"}</span>
            <span className={`col-start-2 row-start-1 justify-self-end rounded-md px-2.5 py-1 text-xs font-semibold xl:col-auto xl:row-auto xl:justify-self-start ${p.is_banned || p.status === "rejected" ? "bg-destructive/10 text-destructive" : p.status === "pending" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-primary/10 text-primary"}`}>{p.is_banned ? "차단됨" : statuses[p.status]}</span>
            <span className="hidden text-sm text-muted-foreground xl:block">{roles[p.role]}</span>
            <span className="hidden text-xs tabular-nums text-muted-foreground xl:block">{formatShortDate(p.created_at)}</span>
            <span className="col-start-2 row-start-2 inline-flex min-h-11 items-center justify-end text-sm font-medium text-primary xl:col-auto xl:row-auto">상세 관리</span>
          </Link>
        </li>)}
      </ul>
    </div>
  )
}
