import Link from "next/link"
import { notFound } from "next/navigation"

import {
  ApplicationStatusForm,
  getVolunteerApplication,
} from "@/features/applications"

export const dynamic = "force-dynamic"

export default async function VolunteerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const app = await getVolunteerApplication(id)

  if (!app) notFound()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/applications" className="hover:text-foreground">
          ← 신청 목록
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          봉사 신청 상세
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(app.submitted_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 제출
        </p>
      </header>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <Card title="신청자 정보">
          <Row label="이름" value={app.applicant_name} />
          <Row
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
          <Row label="인원수" value={`${app.party_size}명`} />
          {app.email && (
            <Row
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
              app.available_days.length > 0
                ? app.available_days.join(", ")
                : "-"
            }
          />
          <Row label="시간대" value={app.available_time ?? "-"} />
        </Card>

        <Card title="희망 활동">
          <div className="flex flex-wrap gap-2">
            {app.activities.length === 0 ? (
              <span className="text-sm text-muted-foreground">-</span>
            ) : (
              app.activities.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground"
                >
                  {a}
                </span>
              ))
            )}
          </div>
        </Card>

        <Card title="자기소개 / 메모">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">
            {app.message || "-"}
          </p>
        </Card>
      </section>

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
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
