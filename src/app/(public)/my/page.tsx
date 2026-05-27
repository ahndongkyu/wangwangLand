import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  HandCoins,
  Heart,
  LogOut,
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
  ] = await Promise.all([
    listMyUpcomingEvents(),
    admin
      .from("adoption_applications")
      .select("id, status, submitted_at, dog:dogs(name), cat:cats(name)")
      .eq("created_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(3),
    admin
      .from("volunteer_applications")
      .select("id, status, submitted_at, available_dates")
      .eq("created_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(3),
    listMyDonations(),
    getVolunteerCountBreakdown(userId),
    admin
      .from("dog_likes")
      .select("dog:dogs(id, name, status, images, thumbnail_index)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4),
    admin
      .from("cat_likes")
      .select("cat:cats(id, name, status, images, thumbnail_index)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4),
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
  const recentDonations = donations.slice(0, 3)

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
  ].slice(0, 4)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-bold text-foreground">마이페이지</h1>

      {/* Row 1: 프로필 | 등급 */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 프로필 */}
        <DashCard label="프로필">
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.nickname}
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="size-full p-3 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <UserName
                nickname={profile.nickname}
                role={profile.role}
                size="md"
                showTier={false}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {profile.phone ?? "전화번호 없음"}
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="mt-3 block w-full rounded-lg border border-border bg-secondary/60 py-1.5 text-center text-xs font-medium text-foreground/70 transition-colors hover:bg-secondary"
          >
            프로필 수정
          </Link>
        </DashCard>

        {/* 현재 등급 */}
        <DashCard label="현재 등급">
          <p className="text-xl font-bold text-foreground">{currentTier.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">봉사 {volunteerCount}회 달성</p>
          {nextTier ? (
            <>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                다음 등급까지 <span className="font-semibold text-primary">{tierRemaining}회</span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-primary">최고 등급 달성 🎉</p>
          )}
        </DashCard>
      </div>

      {/* Row 2: 봉사 횟수 | 다가오는 일정 */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 봉사 횟수 */}
        <DashCard label="봉사 횟수">
          <div className="flex h-full items-center justify-center gap-8 py-2">
            <StatBox value={volunteerCount} label="총" valueClass="text-primary" />
            <StatBox value={volunteerYearly} label="올해" valueClass="text-emerald-600 dark:text-emerald-400" />
            <StatBox value={volunteerMonthly} label="이번 달" valueClass="text-blue-600 dark:text-blue-400" />
          </div>
        </DashCard>

        {/* 다가오는 일정 */}
        <DashCard label="다가오는 일정">
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">예정된 봉사 일정이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 3).map((ev) => {
                const isCustom = ev.category === "custom"
                const color = CATEGORY_COLOR[ev.category]
                const customStyle = isCustom ? customColorStyle(ev.custom_color) : null
                return (
                  <Link
                    key={ev.id}
                    href={`/calendar/${ev.id}`}
                    className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-secondary/50"
                  >
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
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                      {getEventTitle(ev)}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatKoreanDayLabel(ev.starts_at, ev.all_day)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </DashCard>
      </div>

      {/* Row 3: 신청내역 | 후원내역 */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 신청내역 */}
        <DashCard label="신청내역">
          {volunteers.length === 0 && adoptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">신청 내역이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {volunteers.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge className="shrink-0 border-0 bg-secondary text-[10px] font-semibold text-foreground/70">
                      봉사
                    </Badge>
                    <span className="truncate text-xs text-foreground/80">
                      {v.available_dates.length > 0
                        ? v.available_dates[0]
                        : formatDate(v.submitted_at)}
                    </span>
                  </div>
                  <Badge className={cn("shrink-0 border-0 text-[10px] font-semibold", statusBadgeClass(v.status))}>
                    {v.status}
                  </Badge>
                </div>
              ))}
              {adoptions.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge className="shrink-0 border-0 bg-secondary text-[10px] font-semibold text-foreground/70">
                      입양
                    </Badge>
                    <span className="truncate text-xs text-foreground/80">
                      {a.dog?.[0]?.name ?? a.cat?.[0]?.name ?? "신청"}
                    </span>
                  </div>
                  <Badge className={cn("shrink-0 border-0 text-[10px] font-semibold", statusBadgeClass(a.status))}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <Link href="/my/applications" className="mt-3 block text-right text-[11px] font-medium text-primary hover:underline">
            전체 보기 →
          </Link>
        </DashCard>

        {/* 후원내역 */}
        <DashCard label="후원내역">
          {recentDonations.length === 0 ? (
            <p className="text-xs text-muted-foreground">후원 내역이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {recentDonations.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge className="shrink-0 border-0 bg-secondary text-[10px] font-semibold text-foreground/70">
                      {d.type === "cash" ? "현금" : "물품"}
                    </Badge>
                    <span className="truncate text-xs text-foreground/80">
                      {d.type === "cash"
                        ? `${(d.amount ?? 0).toLocaleString()}원`
                        : [d.item_description, d.item_quantity].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(d.donated_at)}
                  </span>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">총 {donations.length}건</p>
            </div>
          )}
          <Link href="/my/donations" className="mt-3 block text-right text-[11px] font-medium text-primary hover:underline">
            전체 보기 →
          </Link>
        </DashCard>
      </div>

      {/* Row 4: 찜한 아이들 (full width) */}
      <div className="mb-3">
        <DashCard label="찜한 아이들">
          {likedAnimals.length === 0 ? (
            <p className="text-xs text-muted-foreground">찜한 아이가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {likedAnimals.map((animal) => {
                const thumbnailSrc =
                  animal.images[animal.thumbnail_index] ?? animal.images[0] ?? null
                return (
                  <Link
                    key={`${animal.kind}:${animal.id}`}
                    href={`/${animal.kind === "dog" ? "dogs" : "cats"}/${animal.id}`}
                    className="group overflow-hidden rounded-xl border border-border bg-muted transition-colors hover:border-primary/30"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      {thumbnailSrc ? (
                        <Image
                          src={thumbnailSrc}
                          alt={animal.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl">
                          {animal.kind === "dog" ? "🐾" : "🐱"}
                        </span>
                      )}
                    </div>
                    <p className="px-2 py-1.5 text-xs font-semibold text-foreground truncate">{animal.name}</p>
                  </Link>
                )
              })}
            </div>
          )}
          {likedAnimals.length > 0 && (
            <Link href="/my/likes" className="mt-3 block text-right text-[11px] font-medium text-primary hover:underline">
              전체 보기 →
            </Link>
          )}
        </DashCard>
      </div>

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
            <span className="block text-sm font-semibold text-primary">어드민 페이지</span>
            <span className="block text-xs text-muted-foreground">운영자 대시보드</span>
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
              <span className="block text-xs text-muted-foreground">계정에서 로그아웃합니다</span>
            </span>
          </button>
        </form>
      </div>

      <DeleteAccountButton />
    </div>
  )
}

/** 대시보드 카드 래퍼 */
function DashCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

/** 봉사 횟수 단일 통계 박스 */
function StatBox({
  value,
  label,
  valueClass,
}: {
  value: number
  label: string
  valueClass?: string
}) {
  return (
    <div className="text-center">
      <p className={cn("text-3xl font-extrabold leading-none", valueClass)}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
