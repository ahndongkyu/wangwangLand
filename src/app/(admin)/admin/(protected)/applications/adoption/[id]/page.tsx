import Link from "next/link"
import { notFound } from "next/navigation"

import {
  ApplicationStatusForm,
  getAdoptionApplication,
} from "@/features/applications"

export const dynamic = "force-dynamic"

function yesNo(value: boolean | null) {
  if (value == null) return "-"
  return value ? "있음" : "없음"
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/applications" className="hover:text-foreground">
          ← 신청 목록
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          입양 신청 상세
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(app.submitted_at).toLocaleString("ko-KR")} 제출
        </p>
      </header>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <Card title="신청자 정보">
          <Row label="이름" value={app.applicant_name} />
          <Row label="연락처" value={<a href={`tel:${app.phone}`} className="text-primary hover:underline">{app.phone}</a>} />
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
          <Row label="주소" value={app.address} />
        </Card>

        <Card title="대상 아이">
          {targetAnimal ? (
            <>
              <Row label="종류" value={targetAnimal.kind} />
              <Row
                label="이름"
                value={
                  <Link
                    href={`/admin/${app.dog ? "dogs" : "cats"}/${targetAnimal.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    {targetAnimal.name} →
                  </Link>
                }
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              특정 아이를 지정하지 않고 일반 문의로 접수됨
            </p>
          )}
        </Card>

        <Card title="가족 · 주거">
          <Row
            label="가족 구성원"
            value={app.family_size != null ? `${app.family_size}명` : "-"}
          />
          <Row label="어린이 여부" value={yesNo(app.has_children)} />
          <Row label="주거 형태" value={app.housing_type ?? "-"} />
          <Row label="소유 형태" value={app.ownership_type ?? "-"} />
        </Card>

        <Card title="반려 경험">
          <Row label="현재 반려동물" value={app.current_pets ?? "-"} multi />
          <Row
            label="과거 경험"
            value={app.past_pet_experience ?? "-"}
            multi
          />
        </Card>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          입양을 결심한 이유
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {app.reason}
        </p>
      </section>

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
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  )
}

function Row({
  label,
  value,
  multi,
}: {
  label: string
  value: React.ReactNode
  multi?: boolean
}) {
  if (multi) {
    return (
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 whitespace-pre-wrap text-foreground/90">
          {value}
        </dd>
      </div>
    )
  }
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-24 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
