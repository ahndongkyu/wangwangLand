"use client"

import { MemberRowActions } from "./member-row-actions"
import type { Profile } from "../api/queries"

interface Props {
  profiles: Profile[]
  isTopAdmin: boolean
}

export function AdminMembersTable({ profiles, isTopAdmin }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <th className="px-4 py-3 text-left">닉네임</th>
            <th className="hidden px-4 py-3 text-left sm:table-cell">전화번호</th>
            <th className="px-4 py-3 text-left">상태</th>
            <th className="hidden px-4 py-3 text-left md:table-cell">권한</th>
            <th className="hidden px-4 py-3 text-left md:table-cell">가입일</th>
            <th className="px-4 py-3 text-right">작업</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <MemberRowActions key={p.id} profile={p} isTopAdmin={isTopAdmin} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
