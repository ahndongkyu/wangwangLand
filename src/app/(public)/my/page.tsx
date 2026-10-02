import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { User } from "lucide-react"

import { DeleteAccountButton, getCurrentProfile } from "@/features/members"
import { signOut } from "@/features/members/api/actions"
import { listMyDonations } from "@/features/donations"
import { listMyUpcomingEvents } from "@/features/events"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import {
  getVolunteerCountBreakdown,
} from "@/features/applications/api/volunteer-history"
import { communityType } from "@/features/daily/lib/community-category"
import { createClient } from "@/shared/lib/supabase/server"
import type { ApplicationStatus } from "@/shared/types/database"

import { MyPageTabs, type MyPostItem } from "./_components/mypage-tabs"

export const metadata: Metadata = { title: "마이페이지" }
export const dynamic = "force-dynamic"


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
  if (!session) redirect("/login")
  const userId = session.user.id

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
    dailyPostsRes,
    storyPostsRes,
    thanksPostsRes,
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
      .select("id, status, submitted_at, available_dates, available_time, party_size")
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
      .from("daily_posts")
      .select("id, title, posted_at, category")
      .eq("created_by", userId)
      .order("posted_at", { ascending: false })
      .limit(20),
    admin
      .from("adoption_stories")
      .select("id, title, published_at")
      .eq("created_by", userId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(20),
    admin.from("donation_thanks").select("id, title, published_at").eq("created_by", userId).not("published_at", "is", null).order("published_at", { ascending: false }).limit(20),
  ])

  const { total: volunteerCount, yearly: volunteerYearly, monthly: volunteerMonthly } = volunteerBreakdown

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
    available_time: string | null
    party_size: number
  }>

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

  const myPosts: MyPostItem[] = [
    ...(dailyPostsRes.data ?? []).map((post) => ({
      id: post.id,
      title: post.title,
      date: post.posted_at,
      label: communityType(post.category),
      href: `/daily/${post.id}`,
      kind: "daily" as const,
    })),
    ...(storyPostsRes.data ?? []).map((post) => ({
      id: post.id,
      title: post.title,
      date: post.published_at!,
      label: "입양 후기",
      href: `/stories/${post.id}`,
      kind: "story" as const,
    })),
    ...(thanksPostsRes.data ?? []).map((post) => ({ id: post.id, title: post.title, date: post.published_at!, label: "후원", href: `/thanks/${post.id}`, kind: "thanks" as const })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  const otherEvents = upcomingEvents.filter(event => event.source_application_type !== "volunteer")
  const nextEvent = upcomingEvents.find(event => event.source_application_type === "volunteer") ?? null
  const volunteerIds = volunteers.map(app => app.id)
  const { data: linkedEvents, error: scheduleError } = volunteerIds.length
    ? await admin.from("events").select("source_application_id, starts_at").eq("source_application_type", "volunteer").in("source_application_id", volunteerIds).order("starts_at", { ascending: true })
    : { data: [], error: null }
  const scheduleByApp: Record<string, string[]> = {}
  for (const event of linkedEvents ?? []) {
    if (event.source_application_id) (scheduleByApp[event.source_application_id] ??= []).push(event.starts_at)
  }
  const volunteerItems = volunteers.map(app => ({ ...app, scheduleStarts: scheduleError ? null : scheduleByApp[app.id] ?? [] }))
  const nextApplication = volunteers.find(app => app.id === nextEvent?.source_application_id)
  const hasPendingSchedule = volunteers.some(app => app.status === "승인" && !scheduleByApp[app.id]?.length)
  const queryFailed = [adoptionRes, volunteerRes, dogLikesRes, catLikesRes, dailyPostsRes, storyPostsRes, thanksPostsRes].some(result => result.error)
  const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"


  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">마이페이지</h1>
        <p className="text-sm text-muted-foreground">내 일정과 활동 기록</p>
      </header>
      {queryFailed && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 p-4 text-sm text-destructive">일부 기록을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>}
      <section aria-label="내 프로필" className="mb-6 grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:p-6">
        <div className="relative size-14 overflow-hidden rounded-full bg-secondary">
          {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill sizes="56px" className="object-cover" /> : <User aria-hidden="true" className="size-full p-3 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold [overflow-wrap:anywhere]">{profile.nickname} 님</p>
          <p className="mt-1 text-sm text-muted-foreground">{profile.role === "admin" ? "관리자" : profile.role === "staff" ? "운영진" : "회원"}</p>
        </div>
        <Link href="/profile" className={buttonClass + " col-start-2 justify-self-start sm:col-start-auto"}>프로필 수정</Link>
      </section>
      <section aria-labelledby="upcoming-title" className="mb-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 id="upcoming-title" className="text-lg font-semibold">다가오는 봉사</h2>
          {nextEvent && <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">일정 확정</span>}
        </div>
        {nextEvent ? <>
          <p className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{new Date(nextEvent.starts_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" })}</p>
          <p className="mt-2 text-sm text-muted-foreground">{formatKoreanDayLabel(nextEvent.starts_at, nextEvent.all_day)}{nextApplication ? ` · ${nextApplication.party_size}명` : ""}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/calendar/${nextEvent.id}`} className={buttonClass + " border-primary bg-primary text-primary-foreground hover:bg-primary/90"}>일정 상세 보기</Link>
            <Link href="/my/applications" className={buttonClass}>신청 확인·변경</Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">방문 전 준비물과 안내사항을 확인해주세요.</p>
        </> : <>
          <p className="mt-4 text-sm text-muted-foreground">{hasPendingSchedule ? "승인된 신청이 있습니다. 확정 일정은 신청 내역에서 확인해주세요." : "현재 확정된 봉사 일정이 없습니다."}</p>
          <Link href={hasPendingSchedule ? "/my/applications" : "/calendar"} className={buttonClass + " mt-4"}>{hasPendingSchedule ? "신청 내역 보기" : "봉사 일정 보기"}</Link>
        </>}
      </section>
      {otherEvents.length > 0 && <section aria-label="다른 참여 일정" className="mb-8 rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">다른 참여 일정</h2><ul className="mt-3 divide-y divide-border">{otherEvents.map(event => <li key={event.id}><Link href={`/calendar/${event.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-primary"><span>{event.title}</span><span className="text-muted-foreground">{formatKoreanDayLabel(event.starts_at, event.all_day)}</span></Link></li>)}</ul></section>}
      <MyPageTabs volunteers={volunteerItems} adoptions={adoptions} donations={donations} likedAnimals={likedAnimals} myPosts={myPosts} />
      <details className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
        <summary className="min-h-11 cursor-pointer font-medium">지난 승인 신청 기록</summary>
        <p className="mt-2">누적 {volunteerCount}건 · 올해 {volunteerYearly}건 · 이번 달 {volunteerMonthly}건</p>
        <p className="mt-2 text-xs text-muted-foreground">첫 희망 날짜가 지난 승인 신청 기준입니다. 실제 참석 여부를 집계한 수치는 아닙니다.</p>
      </details>
      <section aria-label="계정 관리" className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
        {isStaff && <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-primary">관리자 페이지</Link>}
        <Link href="/profile" className="inline-flex min-h-11 items-center hover:text-primary">계정 설정</Link>
        <form action={signOut}><button type="submit" className="min-h-11 cursor-pointer hover:text-foreground">로그아웃</button></form>
        <DeleteAccountButton />
      </section>
    </div>
  )
}
