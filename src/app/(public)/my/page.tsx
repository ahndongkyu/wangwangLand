import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ChevronRight,
  ClipboardList,
  HandCoins,
  LogOut,
  CalendarDays,
  Settings,
  User,
} from "lucide-react"

import { DeleteAccountButton, getCurrentProfile } from "@/features/members"
import { signOut } from "@/features/members/api/actions"
import { listMyDonations } from "@/features/donations"
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  customColorStyle,
  eventDisplayLabel,
  listMyUpcomingEvents,
} from "@/features/events"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import {
  getVolunteerCount,
  getTier,
  getNextTier,
  remainingToNextTier,
  progressToNextTier,
} from "@/features/volunteer-tier"
import { UserName } from "@/shared/components/user-name"
import { Badge } from "@/shared/components/ui/badge"
import { createClient } from "@/shared/lib/supabase/server"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"

export const metadata: Metadata = { title: "마이페이지" }
export const dynamic = "force-dynamic"

function statusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case "접수":
      return "bg-primary/20 text-primary"
    case "검토중":
      return "bg-amber-500/20 text-amber-700 animate-amber-pulse"
    case "승인":
      return "bg-emerald-600/20 text-emerald-700"
    case "반려":
      return "bg-muted text-muted-foreground"
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  })
}

export default async function MyPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status === "pending") redirect("/pending")
  if (profile.status === "rejected") redirect("/rejected")

  const isStaff = profile.role === "staff" || profile.role === "admin"

  // 본인 활동 데이터 — RLS 가 막으므로 admin client 로 created_by 필터.
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session!.user.id

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  const [
    upcomingEvents,
    adoptionRes,
    volunteerRes,
    donations,
    volunteerCount,
  ] = await Promise.all([
    listMyUpcomingEvents(),
    admin
      .from("adoption_applications")
      .select("id, status, submitted_at, dog:dogs(name), cat:cats(name)")
      .eq("created_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(2),
    admin
      .from("volunteer_applications")
      .select("id, status, submitted_at, available_dates")
      .eq("created_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(2),
    listMyDonations(),
    getVolunteerCount(userId),
  ])

  const currentTier = getTier(volunteerCount)
  const nextTier = getNextTier(volunteerCount)
  const tierProgress = progressToNextTier(volunteerCount)
  const tierRemaining = remainingToNextTier(volunteerCount)

  const adoptions = (adoptionRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    dog: { name: string }[] | null
    cat: { name: string }[] | null
  }>
  const volunteers = (volunteerRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    available_dates: string[]
  }>
  const recentDonations = donations.slice(0, 2)

  const totalApps = adoptions.length + volunteers.length
  const totalDonations = donations.length

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
      {/* 프로필 */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.nickname}
                fill
                className="object-cover"
              />
            ) : (
              <User className="size-full p-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <UserName
              nickname={profile.nickname}
              role={profile.role}
              size="md"
              showTier={false}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {currentTier.icon} {currentTier.name}
            </p>
          </div>
          <Link
            href="/profile"
            className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            프로필 수정
          </Link>
        </div>
      </div>

      {/* 봉사 등급 카드 */}
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">현재 등급</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              <span className="mr-1.5">{currentTier.icon}</span>
              {currentTier.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              봉사 인증 <span className="font-bold text-foreground">{volunteerCount}</span>회
            </p>
          </div>
          <Link
            href="/my/applications"
            className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            내 봉사
          </Link>
        </div>

        {nextTier && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>다음 등급: <span className="font-semibold text-foreground">{nextTier.icon} {nextTier.name}</span></span>
              <span><span className="font-bold text-primary">{tierRemaining}</span>회 남음</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 다가오는 봉사 일정 */}
      <Section
        icon={CalendarDays}
        title="다가오는 봉사 일정"
        count={upcomingEvents.length}
        href="/calendar"
        hrefLabel="전체 →"
        emptyText="예정된 봉사 일정이 없습니다."
      >
        {upcomingEvents.slice(0, 3).map((ev) => {
          const isCustom = ev.category === "custom"
          const color = CATEGORY_COLOR[ev.category]
          const customStyle = isCustom ? customColorStyle(ev.custom_color) : null
          return (
            <Link
              key={ev.id}
              href={`/calendar/${ev.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  style={customStyle?.soft}
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    !isCustom && color.soft,
                    !isCustom && color.softText
                  )}
                >
                  {eventDisplayLabel(ev)}
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {ev.title}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatKoreanDayLabel(ev.starts_at, ev.all_day)}
              </span>
            </Link>
          )
        })}
      </Section>

      {/* 신청 내역 */}
      <Section
        icon={ClipboardList}
        title="신청 내역"
        count={totalApps}
        href="/my/applications"
        hrefLabel="전체 →"
        emptyText="아직 신청 내역이 없습니다."
      >
        {volunteers.map((v) => (
          <Link
            key={v.id}
            href="/my/applications"
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Badge className="shrink-0 border-0 bg-secondary text-[10px] font-semibold text-foreground/70">
                봉사
              </Badge>
              <span className="truncate text-sm text-foreground">
                {v.available_dates.length > 0
                  ? `${v.available_dates.join(", ")}`
                  : `${formatDate(v.submitted_at)} 신청`}
              </span>
              <Badge
                className={cn(
                  "shrink-0 border-0 text-[10px] font-semibold",
                  statusBadgeClass(v.status)
                )}
              >
                {v.status}
              </Badge>
            </div>
          </Link>
        ))}
        {adoptions.map((a) => (
          <Link
            key={a.id}
            href="/my/applications"
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Badge className="shrink-0 border-0 bg-secondary text-[10px] font-semibold text-foreground/70">
                입양
              </Badge>
              <span className="truncate text-sm text-foreground">
                {a.dog?.[0]?.name ?? a.cat?.[0]?.name ?? "신청"}
              </span>
              <Badge
                className={cn(
                  "shrink-0 border-0 text-[10px] font-semibold",
                  statusBadgeClass(a.status)
                )}
              >
                {a.status}
              </Badge>
            </div>
          </Link>
        ))}
      </Section>

      {/* 후원 내역 */}
      <Section
        icon={HandCoins}
        title="후원 내역"
        count={totalDonations}
        href="/my/donations"
        hrefLabel="전체 →"
        emptyText="아직 후원 내역이 없습니다."
      >
        {recentDonations.map((d) => (
          <Link
            key={d.id}
            href="/my/donations"
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Badge className="shrink-0 border-0 bg-secondary text-[10px] font-semibold text-foreground/70">
                {d.type === "cash" ? "현금" : "물품"}
              </Badge>
              <span className="truncate text-sm text-foreground">
                {d.type === "cash"
                  ? `${(d.amount ?? 0).toLocaleString()}원`
                  : [d.item_description, d.item_quantity]
                      .filter(Boolean)
                      .join(" · ")}
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatDate(d.donated_at)}
            </span>
          </Link>
        ))}
      </Section>

      {/* 운영진 진입 */}
      {isStaff && (
        <Link
          href="/admin"
          className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Settings className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-primary">
              어드민 페이지
            </span>
            <span className="block text-xs text-muted-foreground">
              운영자 대시보드
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-primary/60" />
        </Link>
      )}

      {/* 로그아웃 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-destructive transition-colors hover:bg-destructive/5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <LogOut className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">로그아웃</span>
              <span className="block text-xs text-muted-foreground">
                계정에서 로그아웃합니다
              </span>
            </span>
          </button>
        </form>
      </div>

      {/* 회원 탈퇴 (가장 하단, 작게) */}
      <DeleteAccountButton />
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  count,
  href,
  hrefLabel,
  emptyText,
  children,
}: {
  icon: typeof User
  title: string
  count: number
  href: string
  hrefLabel: string
  emptyText: string
  children: React.ReactNode
}) {
  // children 이 비어있는지 체크: React 가 빈 배열 등을 children 으로 줄 수 있어 count 로 판정.
  const isEmpty = count === 0
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
          {count > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({count})
            </span>
          )}
        </h2>
        {!isEmpty && (
          <Link
            href={href}
            className="text-xs font-medium text-primary hover:underline"
          >
            {hrefLabel}
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isEmpty ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <div className="divide-y divide-border">{children}</div>
        )}
      </div>
    </section>
  )
}
