import Link from "next/link"
import { AdoptionProcessing, type AdoptionDocument } from "@/features/applications/components/adoption-processing"
import { adoptionStatusLabel } from "@/features/applications/lib/adoption-workflow"
import { requireAdmin } from "@/shared/lib/auth"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { applicationReturnHref } from "@/features/applications/lib/admin-list"
import { notFound } from "next/navigation"
import { MessageSquare, Phone, User } from "lucide-react"

import {
  getAdoptionApplication,
} from "@/features/applications"
import { formatKoreanPhone } from "@/shared/lib/validation"

export const dynamic = "force-dynamic"

function yesNo(value: boolean | null) {
  if (value == null) return "—"
  return value ? "있음" : "없음"
}

export default async function AdoptionApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth.ok) notFound()
  const returnHref = applicationReturnHref((await searchParams).returnTo, "adoption")
  const app = await getAdoptionApplication(id)

  if (!app) notFound()
  const { data: documents, error: documentError } = await createAdminClient().from("adoption_documents")
    .select("id,kind,filename,created_at").eq("application_id",id).order("created_at",{ascending:false})
  if (documentError) throw new Error("서류 목록을 불러오지 못했습니다. 입양상담 SQL 적용 여부를 확인해주세요.", { cause: documentError })

  const targetAnimal = app.dog
    ? { kind: "강아지" as const, ...app.dog }
    : app.cat
      ? { kind: "고양이" as const, ...app.cat }
      : null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href={returnHref} className="hover:text-foreground">
            ← 신청 목록
          </Link>
        </nav>

        {/* 헤더 */}
        <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {app.applicant_name}
            </h1>
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-sm text-primary">{adoptionStatusLabel(app.status, app.completed_at)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">입양상담 신청 상세 · 상담 승인과 실제 입양 완료는 별도입니다.</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>
              {new Date(app.submitted_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                dateStyle: "medium",
                timeStyle: "short",
                hour12: false,
              })}{" "}
              제출
            </span>
          </p>
          {app.status === "취소" ? (
            <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p>취소된 신청입니다.</p>
              {(app as typeof app & { cancel_reason?: string }).cancel_reason && (
                <p>
                  <span className="font-semibold">취소 사유 · </span>
                  {(app as typeof app & { cancel_reason?: string }).cancel_reason}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* 빠른 연락 버튼 */}
        <div className="flex flex-wrap gap-2">
          <a href="#application-processing" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm xl:hidden">신청 처리로 이동</a>
          <ContactButton href={`tel:${app.phone}`} icon={Phone} label="전화" />
          <ContactButton
            href={`sms:${app.phone}`}
            icon={MessageSquare}
            label="문자"
          />
        </div>
        </header>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="contents xl:flex xl:min-w-0 xl:flex-[1.3] xl:flex-col xl:gap-4 [overflow-wrap:anywhere]">
      {/* 대상 아이 — 헤드라인 카드 */}
      {targetAnimal && (
      <section className="order-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
          <div>
            <p className="text-xs text-muted-foreground">처음 희망한 아이 (원래 신청 내용)</p>
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

      {!targetAnimal && <section className="order-1 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">희망하는 아이</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{app.preferred_animal || "상담 후 결정"}</p>
        {app.preferred_animal && <p className="mt-2 text-xs text-muted-foreground">신청자가 직접 입력한 내용입니다. 상담 시 대상 아이를 확인해 주세요.</p>}
      </section>}

      {/* 신청자 + 가족·주거 + 반려경험 */}
      <section className="order-3 grid gap-4 md:grid-cols-2">
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
                {formatKoreanPhone(app.phone)}
              </a>
            }
          />
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

        <Card title="왕왕랜드 방문 가능 일정" className="md:col-span-2">
          <Row
            label="가능 날짜"
            value={
              app.visit_available_dates.length > 0
                ? app.visit_available_dates.join(", ")
                : "—"
            }
            multi
          />
          <Row label="가능 시간" value={app.visit_available_time ?? "—"} />
        </Card>
      </section>

      {/* 입양 결심 이유 */}
      <section className="order-3 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          입양을 결심한 이유
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {app.reason}
        </p>
      </section>

      {/* 자격 확인 / 동의 (신청 시 폼에서 강제) */}
      <details className="order-3 rounded-xl border border-border bg-card p-5">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-foreground">
          신청 시 동의·확인 사항
        </summary>
        <p className="text-xs text-muted-foreground">개인정보 수집·이용: {app.privacy_agreed ? "동의함" : "동의 기록 없음"}</p>
        {app.qualification_answers ? <ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">{Object.entries(app.qualification_answers).map(([key,value]) => <li key={key}>{({ adult:"성인 확인", family_consent:"가족 전원 동의", readiness:"평생 양육 여건", terms_agreed:"이용약관 동의", landlord_consent:"임대인 동의" } as Record<string,string>)[key] ?? key}: {value ? "확인" : "미확인"}</li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">과거 신청으로 개별 확인 기록이 없습니다.</p>}
      </details>

      </div>
      <aside id="application-processing" className="order-2 min-w-0 scroll-mt-20 xl:min-w-[300px] xl:flex-[.85]">
      {/* 처리 */}
      <AdoptionProcessing key={app.updated_at} app={app} documents={(documents ?? []) as AdoptionDocument[]} />
      </aside>
      </div>
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
    <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 ${className ?? ""}`}>
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
      <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
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
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </a>
  )
}
