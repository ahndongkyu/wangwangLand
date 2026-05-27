import type { Metadata } from "next"
import { Crown, Medal, Trophy, User, Users } from "lucide-react"

import { getCurrentProfile } from "@/features/members"
import {
  getVolunteerRanking,
  getTier,
  type RankedVolunteer,
} from "@/features/volunteer-tier"
import { cn } from "@/shared/lib/utils"
import { maskName } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "봉사 랭킹" }
export const dynamic = "force-dynamic"

export default async function RankingPage() {
  const [profile, ranking] = await Promise.all([
    getCurrentProfile(),
    getVolunteerRanking(),
  ])

  const myEntry = profile ? ranking.find((r) => r.userId === profile.id) : null
  const top3 = ranking.slice(0, 3)
  const rest = ranking.slice(3)
  const totalCount = ranking.reduce((s, r) => s + r.count, 0)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">

      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Trophy className="size-7" />
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">봉사 랭킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">왕왕랜드를 빛내는 봉사자들을 소개합니다</p>
      </div>

      {/* 요약 칩 */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <StatChip icon={<Users className="size-3.5" />} label="참여 회원" value={`${ranking.length}명`} />
        <StatChip icon={<Medal className="size-3.5" />} label="총 봉사" value={`${totalCount}회`} />
        {top3[0] && (
          <StatChip icon={<Crown className="size-3.5" />} label="1위" value={maskName(top3[0].nickname)} />
        )}
      </div>

      {/* TOP 3 포디엄 */}
      {top3.length > 0 && (
        <>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Top 3</p>
          <div className="mb-8 flex items-end justify-center gap-3">
            {/* 2위 */}
            {top3[1] ? (
              <PodiumCard entry={top3[1]} myId={profile?.id} />
            ) : <div className="flex-1 max-w-[180px]" />}
            {/* 1위 (더 큼) */}
            <PodiumCard entry={top3[0]} myId={profile?.id} tall />
            {/* 3위 */}
            {top3[2] ? (
              <PodiumCard entry={top3[2]} myId={profile?.id} />
            ) : <div className="flex-1 max-w-[180px]" />}
          </div>
        </>
      )}

      {/* 4위 이하 */}
      {rest.length > 0 && (
        <>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">전체 순위</p>
          <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
            {rest.map((r) => (
              <RankRow key={r.userId} entry={r} myId={profile?.id} />
            ))}
          </div>
        </>
      )}

      {/* 나의 순위 */}
      {myEntry && (
        <>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">나의 순위</p>
          <div className="flex items-center gap-4 rounded-2xl border-2 border-primary/40 bg-primary/5 px-5 py-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              나
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{maskName(myEntry.nickname)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {getTier(myEntry.count, myEntry.role).name} · 봉사 {myEntry.count}회
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold leading-none text-primary">{myEntry.rank}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">위</p>
            </div>
          </div>
        </>
      )}

      {ranking.length === 0 && (
        <div className="py-20 text-center">
          <Users className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">아직 봉사 기록이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

/* ── 포디엄 카드 ── */
const PODIUM_STYLE = {
  1: {
    card: "bg-gradient-to-b from-amber-50 to-white border-amber-200",
    badge: "bg-amber-400 text-amber-900",
    icon: <Crown className="size-3.5" />,
  },
  2: {
    card: "bg-gradient-to-b from-slate-50 to-white border-slate-200",
    badge: "bg-slate-400 text-white",
    icon: <Medal className="size-3.5" />,
  },
  3: {
    card: "bg-gradient-to-b from-orange-50 to-white border-orange-200",
    badge: "bg-orange-400 text-white",
    icon: <Medal className="size-3.5" />,
  },
} as const

function PodiumCard({
  entry,
  myId,
  tall = false,
}: {
  entry: RankedVolunteer
  myId?: string
  tall?: boolean
}) {
  const isMe = entry.userId === myId
  const style = PODIUM_STYLE[entry.rank as 1 | 2 | 3]
  const tier = getTier(entry.count, entry.role)

  return (
    <div
      className={cn(
        "relative flex-1 max-w-[190px] rounded-2xl border p-4 text-center transition-all hover:-translate-y-1 hover:shadow-md",
        style.card,
        tall && "pb-5 pt-6",
        isMe && "outline outline-2 outline-primary outline-offset-2"
      )}
    >
      {/* 순위 배지 */}
      <div
        className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
          style.badge
        )}
      >
        {style.icon}
        {entry.rank}
      </div>

      {/* 아바타 */}
      <div className={cn(
        "relative mx-auto mb-3 flex items-center justify-center rounded-full bg-muted",
        tall ? "size-14" : "size-11"
      )}>
        <User className={cn("text-muted-foreground", tall ? "size-7" : "size-5")} />
        {isMe && (
          <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground border-2 border-white">
            나
          </span>
        )}
      </div>

      <p className={cn("font-bold text-foreground", tall ? "text-base" : "text-sm")}>
        {maskName(entry.nickname)}
      </p>
      <p className={cn("font-extrabold leading-none text-primary mt-1", tall ? "text-3xl" : "text-2xl")}>
        {entry.count}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">회</p>
      <p className="mt-2 text-[10px] text-muted-foreground">{tier.name}</p>
    </div>
  )
}

/* ── 순위 행 ── */
function RankRow({ entry, myId }: { entry: RankedVolunteer; myId?: string }) {
  const isMe = entry.userId === myId
  const tier = getTier(entry.count, entry.role)

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0",
        isMe && "border-l-4 border-l-primary bg-primary/5"
      )}
    >
      <span className={cn("w-7 shrink-0 text-center text-sm font-bold", entry.rank <= 5 ? "text-primary" : "text-muted-foreground")}>
        {entry.rank}
      </span>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <User className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {maskName(entry.nickname)}
          {isMe && (
            <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">나</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{tier.name}</p>
      </div>
      <span className="shrink-0 text-lg font-extrabold text-primary">
        {entry.count}<span className="ml-0.5 text-xs font-normal text-muted-foreground">회</span>
      </span>
    </div>
  )
}

/* ── 요약 칩 ── */
function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground/70">
      <span className="text-muted-foreground">{icon}</span>
      {label} <strong className="text-primary">{value}</strong>
    </div>
  )
}
