import Link from "next/link"
import { notFound } from "next/navigation"
import { Mail, MessageSquare, Phone, Users } from "lucide-react"

import {
  ApplicationStatusForm,
  getVolunteerApplication,
} from "@/features/applications"

export const dynamic = "force-dynamic"

const STATUS_COLOR: Record<string, string> = {
  접수: "bg-primary/15 text-primary",
  검토중: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  승인: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  반려: "bg-muted text-muted-foreground",
}

export default async function VolunteerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const app = await getVolunteerApplication(id)

  if (!app) notFound()

  const isMember = !!app.created_by
  const isGroup = app.party_size > 1

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
              봉사 신청 상세
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
            <span>·</span>
            {isMember ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                회원
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                비회원
              </span>
            )}
            <span>·</span>
            {isGroup ? (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                단체 ({app.party_size}명)
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                개인
              </span>
            )}
          </p>
        </div>

        {/* 빠른 연락 */}
        <div className="flex flex-wrap gap-2">
          <ContactButton href={`tel:${app.phone}`} icon={Phone} label="전화" />
          <ContactButton
            href={`sms:${app.phone}`}
            icon={MessageSquare}
            label="문자"
          />
          {app.email && (
            <ContactButton
              href={`mailto:${app.email}`}
              icon={Mail}
              label="이메일"
            />
          )}
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title={isGroup ? "단체 / 인솔자 정보" : "신청자 정보"}>
          <Row
            label={isGroup ? "단체명/인솔자" : "이름"}
            value={app.applicant_name}
          />
          <Row
            label="연락처"
            icon={Phone}
            value={
              <a
                href={`tel:${app.phone}`}
                className="text-primary hover:underline"
              >
                {app.phone}
              </a>
            }
          />
          <Row
            icon={Users}
            label="인원수"
            value={`${app.party_size}명${isGroup ? " (단체)" : ""}`}
          />
          {app.email && (
            <Row
              icon={Mail}
              label="이메일"
              value={
                <a
                  href={`mailto:${app.email}`}
                  className="text-primary hover:underline"
                >
                  {app.email}
                </a>
              }
            />
          )}
        </Card>

        <Card title="가능 일정">
          <Row
            label="요일"
            value={
              app.available_days.length > 0 ? app.available_days.join(", ") : "—"
            }
          />
          <Row label="시간대" value={app.available_time ?? "—"} />
        </Card>

        <Card title="희망 활동" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {app.activities.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              app.activities.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {a}
                </span>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* 자기소개 / 메모 */}
      {app.message && (
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            자기소개 / 메모
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {app.message}
          </p>
        </section>
      )}

      {/* 신청 시 동의 사항 */}
      <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          신청 시 동의·확인 사항
        </h2>
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>• 봉사 활동 중 위험(물림·스크래치·알레르기) 인지</li>
          <li>• 단체의 안전 수칙 준수</li>
          {isGroup && <li>• 미성년자 포함 시 보호자 동의·인솔</li>}
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
        kind="volunteer"
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
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="flex w-24 shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
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
