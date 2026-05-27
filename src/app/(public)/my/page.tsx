import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, LogOut, Settings, User } from "lucide-react"

import { DeleteAccountButton, getCurrentProfile } from "@/features/members"
import { signOut } from "@/features/members/api/actions"
import { listMyDonations } from "@/features/donations"
import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  getEventTitle,
  listMyUpcomingEvents,
} from "@/features/events"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import {
  getVolunteerCountBreakdown,
  getTier,
  getNextTier,
  remainingToNextTier,
  progressToNextTier,
  VOLUNTEER_TIERS,
} from "@/features/volunteer-tier"
import { UserName } from "@/shared/components/user-name"
import { createClient } from "@/shared/lib/supabase/server"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"

import { MyPageTabs } from "./_components/mypage-tabs"

export const metadata: Metadata = { title: "마이페이지" }
export const dynamic = "force-dynamic"

// 등급 dots 에 표시할 짧은 이름
const TIER_SHORT = ["예비", "새싹", "새내기", "어엿한", "지킴이", "베테랑", "명예"]

export default async function MyPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status === "pending") redirect("/pending")
  if (profile.status === "rejected") redirect("/rejected")

  const isStaff = profile.role === "staff" || profile.role === "admin"

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
    volunteerBreakdown,
    dogLikesRes,
    catLikesRes,
    dogLikesCountRes,
    catLikesCountRes,
    adoptionCountRes,
  ] = await Promise.all([
    listMyUpcomingEvents(),
    admin
      .from("adoption_applications")
      .select("id, status, submitted_at, dog:dogs(name), cat:cats(name)")
      .eq("created_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(20),
    admin
      .from("volunteer_applications")
      .select("id, status, submitted_at, available_dates")
      .eq("created_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(20),
    listMyDonations(),
    getVolunteerCountBreakdown(userId),
    admin
      .from("dog_likes")
      .select("dog:dogs(id, name, status, images, thumbnail_index)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("cat_likes")
      .select("cat:cats(id, name, status, images, thumbnail_index)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("dog_likes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("cat_likes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("adoption_applications")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId),
  ])

  const { total: volunteerCount, yearly: volunteerYearly, monthly: volunteerMonthly } = volunteerBreakdown

  const currentTier = getTier(volunteerCount, profile.role)
  const nextTier = getNextTier(volunteerCount, profile.role)
  const tierProgress = progressToNextTier(volunteerCount, profile.role)
  const tierRemaining = remainingToNextTier(volunteerCount, profile.role)

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

  const totalLikes = (dogLikesCountRes.count ?? 0) + (catLikesCountRes.count ?? 0)
  const totalAdoptions = adoptionCountRes.count ?? 0
  const activeAdoptions = adoptions.filter((a) => a.status !== "반려").length

  // 현금 후원 승인 총액
  const totalCashDonation = donations
    .filter((d) => d.type === "cash" && d.status === "approved")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const yearlyCashDonation = donations
    .filter(
      (d) =>
        d.type === "cash" &&
        d.status === "approved" &&
        new Date(d.donated_at) >= yearStart
    )
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)

  type LikeAnimalPreview = {
    id: string
    name: string
    status: string
    images: string[]
    thumbnail_index: number
  }
  const likedDogPreviews = (dogLikesRes.data ?? [])
    .map((r) => (Array.isArray(r.dog) ? r.dog[0] : r.dog))
    .filter(Boolean) as LikeAnimalPreview[]
  const likedCatPreviews = (catLikesRes.data ?? [])
    .map((r) => (Array.isArray(r.cat) ? r.cat[0] : r.cat))
    .filter(Boolean) as LikeAnimalPreview[]
  const likedAnimals = [
    ...likedDogPreviews.map((d) => ({ ...d, kind: "dog" as const })),
    ...likedCatPreviews.map((c) => ({ ...c, kind: "cat" as const })),
  ]

  const nextEvent = upcomingEvents[0] ?? null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">

      {/* ── 환영 헤더 ── */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 to-primary/3 p-7">
        {/* 배경 워터마크 */}
        <span className="pointer-events-none absolute -bottom-8 -right-5 select-none text-[160px] leading-none opacity-[0.05]">
          🐾
        </span>
        <div className="relative flex items-center gap-5">
          {/* 아바타 */}
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-background/80 bg-muted shadow-md">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
            ) : (
              <User className="size-full p-4 text-muted-foreground" />
            )}
          </div>
          {/* 정보 */}
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs text-foreground/50">안녕하세요</p>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <UserName nickname={profile.nickname} role={profile.role} size="md" showTier={false} />
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/80 px-3 py-0.5 text-xs font-semibold text-primary">
                <span>{currentTier.icon}</span>{currentTier.name}
              </span>
            </div>
            <p className="text-xs text-foreground/60">오늘도 따뜻한 마음 감사합니다. 아이들이 기다리고 있어요.</p>
          </div>
          {/* 수정 버튼 */}
          <Link
            href="/profile"
            className="hidden shrink-0 rounded-xl border border-border bg-background/80 px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary sm:block"
          >
            프로필 수정
          </Link>
        </div>
      </div>

      {/* ── 등급 진행도 ── */}
      <div className="mb-5 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            현재 등급{" "}
            <strong className="text-primary">{currentTier.icon} {currentTier.name}</strong>
          </p>
          {nextTier ? (
            <p className="text-xs text-muted-foreground">
              다음 등급까지{" "}
              <span className="font-semibold text-foreground">{nextTier.icon} {nextTier.name} {tierRemaining}회</span>
            </p>
          ) : (
            <p className="text-xs font-semibold text-primary">최고 등급 달성 🎉</p>
          )}
        </div>
        {/* 프로그레스 바 */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
            style={{ width: `${tierProgress}%` }}
          />
        </div>
        {/* 등급 레벨 점 */}
        <div className="mt-3 flex justify-between">
          {VOLUNTEER_TIERS.map((tier, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "text-base leading-none transition-all",
                  currentTier.level >= tier.level ? "opacity-100" : "opacity-25"
                )}
              >
                {tier.icon}
              </span>
              <span
                className={cn(
                  "text-[9px] leading-tight",
                  currentTier.level === tier.level
                    ? "font-bold text-primary"
                    : "text-muted-foreground"
                )}
              >
                {TIER_SHORT[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 활동 현황 4칸 그리드 ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActivityCard
          icon="✋"
          iconBg="bg-primary/10"
          label="총 봉사"
          value={volunteerCount}
          unit="회"
          sub={`올해 ${volunteerYearly}회 · 이번 달 ${volunteerMonthly}회`}
        />
        <ActivityCard
          icon="❤️"
          iconBg="bg-rose-100"
          label="총 후원"
          value={totalCashDonation.toLocaleString()}
          unit="원"
          sub={`올해 ${yearlyCashDonation.toLocaleString()}원`}
        />
        <ActivityCard
          icon="🏠"
          iconBg="bg-emerald-100"
          label="입양 신청"
          value={totalAdoptions}
          unit="건"
          sub={`진행 중 ${activeAdoptions}건`}
        />
        <ActivityCard
          icon="⭐"
          iconBg="bg-amber-100"
          label="찜한 아이들"
          value={totalLikes}
          unit="마리"
          sub={totalLikes === 0 ? "관심 목록 비어있음" : `${likedAnimals[0]?.name ?? ""} 외`}
        />
      </div>

      {/* ── 다가오는 일정 ── */}
      {nextEvent ? (
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2A3D2F] to-[#3a5440] p-6 text-white">
          <span className="pointer-events-none absolute -bottom-2 right-6 select-none text-7xl leading-none opacity-10">
            📅
          </span>
          <div className="relative flex items-center gap-4">
            {/* 날짜 박스 */}
            <div className="shrink-0 rounded-xl bg-white/15 px-4 py-3 text-center">
              <p className="text-[10px] text-white/70">
                {new Date(nextEvent.starts_at).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  weekday: "short",
                })}
              </p>
              <p className="text-2xl font-bold leading-none">
                {new Date(nextEvent.starts_at).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  day: "numeric",
                })}
              </p>
              <p className="text-[10px] text-white/70">
                {new Date(nextEvent.starts_at).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  month: "long",
                })}
              </p>
            </div>
            {/* 이벤트 정보 */}
            <div className="min-w-0 flex-1">
              {(() => {
                const isCustom = nextEvent.category === "custom"
                const color = CATEGORY_COLOR[nextEvent.category]
                const customStyle = isCustom ? customColorStyle(nextEvent.custom_color) : null
                return (
                  <span
                    style={customStyle?.soft}
                    className={cn(
                      "mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold",
                      !isCustom && color.soft,
                      !isCustom && color.softText
                    )}
                  >
                    {eventDisplayLabel(nextEvent)}
                  </span>
                )
              })()}
              <p className="text-base font-bold">{getEventTitle(nextEvent)}</p>
              <p className="mt-1 text-xs text-white/70">
                {formatKoreanDayLabel(nextEvent.starts_at, nextEvent.all_day)}
              </p>
            </div>
            {/* 상세 보기 버튼 */}
            <Link
              href={`/calendar/${nextEvent.id}`}
              className="hidden shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#2A3D2F] transition-opacity hover:opacity-90 sm:block"
            >
              상세 보기
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">예정된 봉사 일정이 없습니다.</p>
          <Link href="/calendar" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
            봉사 일정 보기 →
          </Link>
        </div>
      )}

      {/* ── 탭 섹션 (신청내역 / 후원내역 / 찜한아이들) ── */}
      <MyPageTabs
        volunteers={volunteers}
        adoptions={adoptions}
        donations={donations}
        likedAnimals={likedAnimals}
      />

      {/* ── 계정 관리 ── */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
        {isStaff && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/50"
          >
            <Settings className="size-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-primary">어드민 페이지</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        )}
        <Link
          href="/profile"
          className="flex items-center gap-3 border-t border-border px-5 py-4 transition-colors hover:bg-secondary/50 first:border-t-0"
        >
          <User className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm text-foreground">프로필 수정</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 border-t border-border px-5 py-4 text-left text-destructive transition-colors hover:bg-destructive/5"
          >
            <LogOut className="size-4" />
            <span className="flex-1 text-sm font-medium">로그아웃</span>
            <ChevronRight className="size-4 opacity-50" />
          </button>
        </form>
      </div>

      {/* ── 회원 탈퇴 ── */}
      <DeleteAccountButton />
    </div>
  )
}

function ActivityCard({
  icon,
  iconBg,
  label,
  value,
  unit,
  sub,
}: {
  icon: string
  iconBg: string
  label: string
  value: number | string
  unit: string
  sub: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn("mb-3 flex size-10 items-center justify-center rounded-xl text-lg", iconBg)}>
        {icon}
      </div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold leading-none text-foreground">
        {value}
        <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{sub}</p>
    </div>
  )
}
