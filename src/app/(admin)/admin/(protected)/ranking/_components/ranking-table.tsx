"use client"

import { useState } from "react"
import { Crown, Filter, Medal, Phone, Trophy, User } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { getTier, VOLUNTEER_TIERS, type RankedVolunteer } from "@/features/volunteer-tier"

interface Props {
  ranking: RankedVolunteer[]
  myId?: string
}

export function AdminRankingTable({ ranking, myId }: Props) {
  const [tierFilter, setTierFilter] = useState<number | null>(null)

  const filtered = tierFilter === null
    ? ranking
    : ranking.filter((r) => getTier(r.count, r.role).level === tierFilter)

  const RANK_ICON = (rank: number) => {
    if (rank === 1) return <Crown className="size-4 text-amber-500" />
    if (rank === 2) return <Medal className="size-4 text-slate-400" />
    if (rank === 3) return <Medal className="size-4 text-orange-400" />
    return <span className="w-4 text-center text-sm font-bold text-muted-foreground">{rank}</span>
  }

  return (
    <div>
      {/* 등급 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        <button
          onClick={() => setTierFilter(null)}
          className={cn(
            "rounded-lg border px-3 py-1 text-xs font-semibold transition-colors",
            tierFilter === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-secondary"
          )}
        >
          전체 ({ranking.length})
        </button>
        {VOLUNTEER_TIERS.map((tier) => {
          const count = ranking.filter((r) => getTier(r.count, r.role).level === tier.level).length
          if (count === 0) return null
          return (
            <button
              key={tier.level}
              onClick={() => setTierFilter(tier.level)}
              className={cn(
                "rounded-lg border px-3 py-1 text-xs font-semibold transition-colors",
                tierFilter === tier.level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {tier.name} ({count})
            </button>
          )
        })}
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-5 py-2.5">
          <span className="w-8 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">순위</span>
          <span className="w-8 shrink-0" />
          <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">회원</span>
          <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">등급</span>
          <span className="w-16 shrink-0 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">봉사 횟수</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="mx-auto mb-3 size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">해당 등급 회원이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => {
              const isMe = r.userId === myId
              const tier = getTier(r.count, r.role)
              return (
                <div
                  key={r.userId}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/30",
                    isMe && "border-l-4 border-l-primary bg-primary/5"
                  )}
                >
                  {/* 순위 아이콘 */}
                  <div className="flex w-8 shrink-0 justify-center">
                    {RANK_ICON(r.rank)}
                  </div>
                  {/* 아바타 */}
                  <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="size-4 text-muted-foreground" />
                    {isMe && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground border border-white">
                        나
                      </span>
                    )}
                  </div>
                  {/* 이름 + 전화 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {r.nickname}
                      {isMe && (
                        <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">나</span>
                      )}
                    </p>
                    {r.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        {r.phone}
                      </p>
                    )}
                  </div>
                  {/* 등급 */}
                  <span className="w-28 shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {tier.name}
                  </span>
                  {/* 횟수 */}
                  <span className="w-16 shrink-0 text-right text-base font-extrabold text-primary">
                    {r.count}<span className="ml-0.5 text-xs font-normal text-muted-foreground">회</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
