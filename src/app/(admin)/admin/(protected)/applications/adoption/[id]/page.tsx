import Link from "next/link"
import { notFound } from "next/navigation"
import { KeyRound, MessageSquare, Phone, User } from "lucide-react"

import {
  ApplicationStatusForm,
  getAdoptionApplication,
} from "@/features/applications"

export const dynamic = "force-dynamic"

function yesNo(value: boolean | null) {
  if (value == null) return "—"
  return value ? "있음" : "없음"
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

const STATUS_COLOR: Record<string, string> = {
  접수: "bg-primary/15 text-primary",
  검토중: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  승인: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  반려: "bg-muted text-muted-foreground",
}

export default async function AdoptionApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const app = await getAdoptionApplication(id)

  if (!app) notFound()

  const targetAnimal = app.dog
    ? { kind: "강아지" as const, ...app.dog }
    : app.cat
      ? { kind: "고양이" as const, ...app.cat }
      : null

  const isMember = !!app.created_by

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/applications" className="hover:text-foreground">
          ← 신청 목록
        </Link>
      </nav>

      {/* 헤더 */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              입양 신청 상세
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[app.status] ?? "bg-secondary"}`}
            >
              {app.status}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>
              {new Date(app.submitted_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              제출
            </span>
          </p>
          {app.status !== "접수" && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
              ℹ️ 이 신청은 이미 <span className="font-semibold">{app.status}</span> 처리되었어요.
            </div>
          )}
        </div>

        {/* 빠른 연락 버튼 */}
        <div className="flex flex-wrap gap-2">
          <ContactButton href={`tel:${app.phone}`} icon={Phone} label="전화" />
          <ContactButton
            href={`sms:${app.phone}`}
            icon={MessageSquare}
            label="문자"
          />
        </div>
      </header>

      {/* 대상 아이 — 헤드라인 카드 */}
      {targetAnimal && (
        <section className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div>
            <p className="text-xs text-muted-foreground">대상 아이</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {targetAnimal.name}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({targetAnimal.kind})
              </span>
            </p>
          </div>
          <Link
            href={`/admin/${app.dog ? "dogs" : "cats"}/${targetAnimal.id}/edit`}
            className="text-sm font-medium text-primary hover:underline"
          >
            아이 정보 →
          </Link>
        </section>
      )}

      {/* 신청자 + 가족·주거 + 반려경험 */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="신청자 정보">
          <Row icon={User} label="이름" value={app.applicant_name} />
          <Row
            icon={Phone}
            label="연락처"
            value={
              <a
                href={`tel:${app.phone}`}
                className="text-primary hover:underline"
              >
                {app.phone}
              </a>
            }
          />
          {isMember && (
            <Row
              icon={KeyRound}
              label="가입 방법"
              value={providerLabel(app.signup_provider)}
            />
          )}
          <Row label="주소" value={app.address} />
        </Card>

        <Card title="가족 · 주거">
          <Row
            label="가족 구성원"
            value={app.family_size != null ? `${app.family_size}명` : "—"}
          />
          <Row label="어린이 여부" value={yesNo(app.has_children)} />
          <Row label="주거 형태" value={app.housing_type ?? "—"} />
          <Row label="소유 형태" value={app.ownership_type ?? "—"} />
        </Card>

        <Card title="반려 경험" className="md:col-span-2">
          <Row label="현재 반려동물" value={app.current_pets ?? "—"} multi />
          <Row label="과거 경험" value={app.past_pet_experience ?? "—"} multi />
        </Card>
      </section>

      {/* 입양 결심 이유 */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          입양을 결심한 이유
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {app.reason}
        </p>
      </section>

      {/* 자격 확인 / 동의 (신청 시 폼에서 강제) */}
      <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          신청 시 동의·확인 사항
        </h2>
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>• 만 19세 이상 성인</li>
          <li>• 동거 가족 전원의 입양 동의</li>
          <li>• 양육 가능한 경제·시간 여건</li>
          {(app.ownership_type === "전세" || app.ownership_type === "월세") && (
            <li>• 임대인의 반려동물 양육 동의</li>
          )}
          <li>• 개인정보 수집·이용 동의</li>
          <li>• 이용약관 동의</li>
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          신청 폼에서 위 항목을 모두 체크해야 제출이 가능합니다.
        </p>
      </section>

      {/* 처리 */}
      <h2 className="mb-3 text-lg font-semibold text-foreground">처리</h2>
      <ApplicationStatusForm
        id={app.id}
        kind="adoption"
        currentStatus={app.status}
        currentNote={app.admin_note}
        applicantName={app.applicant_name}
      />
    </div>
  )
}

function Card({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  multi,
}: {
  icon?: typeof User
  label: string
  value: React.ReactNode
  multi?: boolean
}) {
  if (multi) {
    return (
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 whitespace-pre-wrap text-foreground/90">{value}</dd>
      </div>
    )
  }
  return (
    <div className="flex items-baseline gap-3">
      <dt className="flex w-24 shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ContactButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Phone
  label: string
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </a>
  )
}
