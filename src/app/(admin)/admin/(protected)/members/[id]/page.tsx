import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  BarChart3,
  HandHeart,
  Handshake,
  Home,
  KeyRound,
  PawPrint,
  Pencil,
  User,
} from "lucide-react"

import { getCurrentAdmin } from "@/features/auth"
import { getProfileDetail, MemberManagePanel } from "@/features/members"
import { listDailyPostsByUser, countDailyPostsByUser } from "@/features/daily"
import {
  listAdoptionStoriesByUser,
  countAdoptionStoriesByUser,
} from "@/features/stories"
import { listApplicationsByEmail } from "@/features/applications"
import {
  listDonationsByUser,
  DonationStatusBadge,
} from "@/features/donations"
import { Badge } from "@/shared/components/ui/badge"
import { UserName } from "@/shared/components/user-name"
import { getVolunteerCount } from "@/features/volunteer-tier"
import { cn, formatShortDate } from "@/shared/lib/utils"
import type { Profile } from "@/features/members"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<Profile["status"], string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
}

const STATUS_COLOR: Record<Profile["status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
}

function formatJoinedAt(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function providerLabel(provider: string | null): string {
  switch (provider) {
    case "kakao":
      return "카카오"
    case "google":
      return "구글"
    case "naver":
      return "네이버"
    case "apple":
      return "애플"
    case "email":
      return "이메일"
    default:
      return "—"
  }
}

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const me = await getCurrentAdmin()
  const isTopAdmin = me?.role === "admin"

  const profile = await getProfileDetail(id)
  if (!profile) notFound()

  const volunteerCount = await getVolunteerCount(profile.id)

  const [
    dailyPosts,
    storiesPosts,
    dailyCount,
    storiesCount,
    apps,
    donations,
  ] = await Promise.all([
    listDailyPostsByUser(id, 5),
    listAdoptionStoriesByUser(id, 5),
    countDailyPostsByUser(id),
    countAdoptionStoriesByUser(id),
    profile.email
      ? listApplicationsByEmail(profile.email)
      : Promise.resolve({ adoption: [], volunteer: [] }),
    listDonationsByUser(id),
  ])

  const approvedCash = donations
    .filter((d) => d.status === "approved" && d.type === "cash")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const approvedGoodsCount = donations.filter(
    (d) => d.status === "approved" && d.type === "goods"
  ).length

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/members" className="hover:text-foreground">
          ← 회원 관리
        </Link>
      </nav>

      {/* ─── 회원 정보 ─── */}
      <Section title="회원 정보">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
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
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <UserName
                nickname={profile.nickname}
                role={profile.role}
                volunteerCount={volunteerCount}
                size="md"
              />
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  STATUS_COLOR[profile.status]
                )}
              >
                {STATUS_LABEL[profile.status]}
              </span>
              {profile.is_banned && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  차단됨
                </span>
              )}
            </div>
            <dl className="mt-1 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <KeyRound className="size-3" aria-hidden />
                가입 방법
              </dt>
              <dd className="text-foreground">{providerLabel(profile.signup_provider)}</dd>
              <dt className="text-xs text-muted-foreground">핸드폰</dt>
              <dd className={profile.phone ? "text-foreground" : "text-muted-foreground"}>
                {profile.phone ?? "미등록"}
              </dd>
              <dt className="text-xs text-muted-foreground">가입일</dt>
              <dd className="text-xs text-muted-foreground">
                {formatJoinedAt(profile.created_at)}
              </dd>
            </dl>
          </div>
        </div>
        <div className="border-t border-border p-5">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">관리</p>
          <MemberManagePanel profile={profile} isTopAdmin={isTopAdmin} />
        </div>

        {/* 약관 동의 정보 */}
        <div className="border-t border-border p-5">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">약관 동의</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <AgreementItem
              label="이용약관"
              agreedAt={profile.terms_agreed_at}
              version={profile.terms_version}
              required
            />
            <AgreementItem
              label="개인정보 처리방침"
              agreedAt={profile.privacy_agreed_at}
              version={profile.privacy_version}
              required
            />
            <AgreementItem
              label="마케팅 수신"
              agreedAt={profile.marketing_agreed_at}
            />
          </dl>
        </div>
      </Section>

      {/* ─── 활동 요약 ─── */}
      <SectionTitle icon={BarChart3}>활동 요약</SectionTitle>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="작성 일상" value={`${dailyCount}건`} />
        <Stat label="작성 입양후기" value={`${storiesCount}건`} />
        <Stat
          label="신청 (입양/봉사)"
          value={`${apps.adoption.length} / ${apps.volunteer.length}건`}
        />
        <Stat
          label="후원 기록완료"
          value={`${approvedCash.toLocaleString()}원${approvedGoodsCount ? ` · 물품 ${approvedGoodsCount}` : ""}`}
        />
      </div>

      {/* ─── 작성 일상 ─── */}
      <SectionTitle
        icon={Pencil}
        linkLabel={dailyCount > 5 ? `전체 ${dailyCount}건` : undefined}
        linkHref={`/admin/daily`}
      >
        작성 일상 (최근 5)
      </SectionTitle>
      {dailyPosts.length === 0 ? (
        <Empty text="작성한 일상이 없습니다." />
      ) : (
        <ul className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
          {dailyPosts.map((p) => (
            <li key={p.id} className="border-b border-border last:border-0">
              <Link
                href={`/admin/daily/${p.id}/edit`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {p.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(p.posted_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ─── 작성 입양후기 ─── */}
      <SectionTitle
        icon={PawPrint}
        linkLabel={storiesCount > 5 ? `전체 ${storiesCount}건` : undefined}
        linkHref={`/admin/stories`}
      >
        작성 입양후기 (최근 5)
      </SectionTitle>
      {storiesPosts.length === 0 ? (
        <Empty text="작성한 입양후기가 없습니다." />
      ) : (
        <ul className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
          {storiesPosts.map((s) => (
            <li key={s.id} className="border-b border-border last:border-0">
              <Link
                href={`/admin/stories/${s.id}/edit`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {s.title}
                  </span>
                  {s.dog && (
                    <span className="text-[11px] text-primary/80">
                      {s.dog.name}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(s.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ─── 입양 신청 ─── */}
      <SectionTitle icon={Home}>입양 신청</SectionTitle>
      {apps.adoption.length === 0 ? (
        <Empty text="입양 신청 내역이 없습니다." />
      ) : (
        <ul className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
          {apps.adoption.map((a) => (
            <li key={a.id} className="border-b border-border last:border-0">
              <Link
                href={`/admin/applications/adoption/${a.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge
                    className={cn("border-0 text-[10px]", appStatusClass(a.status))}
                  >
                    {a.status}
                  </Badge>
                  <span className="truncate text-sm text-foreground">
                    {(a as { dog?: { name?: string } | null }).dog?.name ??
                      (a as { cat?: { name?: string } | null }).cat?.name ??
                      "—"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(a.submitted_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ─── 봉사 신청 ─── */}
      <SectionTitle icon={Handshake}>봉사 신청</SectionTitle>
      {apps.volunteer.length === 0 ? (
        <Empty text="봉사 신청 내역이 없습니다." />
      ) : (
        <ul className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
          {apps.volunteer.map((v) => (
            <li key={v.id} className="border-b border-border last:border-0">
              <Link
                href={`/admin/applications/volunteer/${v.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge
                    className={cn("border-0 text-[10px]", appStatusClass(v.status))}
                  >
                    {v.status}
                  </Badge>
                  <span className="truncate text-sm text-foreground">
                    {(v.activities ?? []).join(", ") || "—"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(v.submitted_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ─── 후원 내역 ─── */}
      <SectionTitle icon={HandHeart}>후원 내역</SectionTitle>
      {donations.length === 0 ? (
        <Empty text="후원 내역이 없습니다." />
      ) : (
        <ul className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
          {donations.map((d) => (
            <li key={d.id} className="border-b border-border last:border-0">
              <Link
                href={`/admin/donations/${d.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <DonationStatusBadge status={d.status} />
                  <span className="truncate text-sm text-foreground">
                    {d.type === "cash"
                      ? `${(d.amount ?? 0).toLocaleString()}원`
                      : [d.item_description, d.item_quantity]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(d.donated_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
      <p className="border-b border-border bg-secondary/40 px-5 py-2.5 text-xs font-semibold text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  )
}

function SectionTitle({
  children,
  icon: Icon,
  linkLabel,
  linkHref,
}: {
  children: React.ReactNode
  icon?: typeof User
  linkLabel?: string
  linkHref?: string
}) {
  return (
    <div className="mb-2 flex items-end justify-between">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
        {children}
      </h2>
      {linkLabel && linkHref && (
        <Link href={linkHref} className="text-xs text-primary hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-foreground">{value}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mb-8 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  )
}

function AgreementItem({
  label,
  agreedAt,
  version,
  required,
}: {
  label: string
  agreedAt: string | null
  version?: string | null
  required?: boolean
}) {
  const ok = !!agreedAt
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            ok
              ? "bg-primary/15 text-primary"
              : required
                ? "bg-destructive/15 text-destructive"
                : "bg-secondary text-muted-foreground"
          )}
        >
          {ok ? "동의" : required ? "미동의" : "선택 X"}
        </span>
      </div>
      {ok && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {new Date(agreedAt).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {version && <> · v{version}</>}
        </p>
      )}
    </div>
  )
}

function appStatusClass(status: string): string {
  switch (status) {
    case "접수":
      return "bg-primary/20 text-primary"
    case "검토중":
      return "bg-amber-500/20 text-amber-700"
    case "승인":
      return "bg-emerald-600/20 text-emerald-700"
    case "반려":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-secondary text-muted-foreground"
  }
}
