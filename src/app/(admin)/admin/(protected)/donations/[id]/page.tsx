import Link from "next/link"
import { notFound } from "next/navigation"

import {
  getDonation,
  DonationStatusBadge,
  DonationAdminActions,
} from "@/features/donations"

export const dynamic = "force-dynamic"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default async function AdminDonationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const donation = await getDonation(id)
  if (!donation) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/donations" className="hover:text-foreground">
          ← 후원 관리
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            후원 상세
          </h1>
          <DonationStatusBadge status={donation.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/thanks/new?donationId=${donation.id}`}
            className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            + 감사글 작성
          </Link>
          <DonationAdminActions id={donation.id} status={donation.status} />
        </div>
      </header>

      {/* 후원 내용 */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">후원 내용</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">종류</dt>
          <dd className="text-foreground">
            {donation.type === "cash" ? "현금" : "물품"}
          </dd>
          {donation.type === "cash" ? (
            <>
              <dt className="text-muted-foreground">금액</dt>
              <dd className="font-semibold text-foreground">
                {(donation.amount ?? 0).toLocaleString()}원
              </dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">물품명</dt>
              <dd className="text-foreground">{donation.item_description}</dd>
              {donation.item_quantity && (
                <>
                  <dt className="text-muted-foreground">수량/규격</dt>
                  <dd className="text-foreground">{donation.item_quantity}</dd>
                </>
              )}
            </>
          )}
          <dt className="text-muted-foreground">후원 일자</dt>
          <dd className="text-foreground">{formatDate(donation.donated_at)}</dd>

          {donation.message && (
            <>
              <dt className="text-muted-foreground">메시지</dt>
              <dd className="text-foreground">“{donation.message}”</dd>
            </>
          )}
        </dl>
      </section>

      {/* 후원자 */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">후원자 정보</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">이름</dt>
          <dd className="font-semibold text-foreground">{donation.donor_name}</dd>
          <dt className="text-muted-foreground">이메일</dt>
          <dd className="text-foreground">{donation.email}</dd>
          {donation.phone && (
            <>
              <dt className="text-muted-foreground">연락처</dt>
              <dd className="text-foreground">{donation.phone}</dd>
            </>
          )}
          {donation.display_name && (
            <>
              <dt className="text-muted-foreground">공개 표시명</dt>
              <dd className="text-foreground">{donation.display_name}</dd>
            </>
          )}
          <dt className="text-muted-foreground">익명 처리</dt>
          <dd className="text-foreground">{donation.is_anonymous ? "예" : "아니오"}</dd>
          <dt className="text-muted-foreground">회원 여부</dt>
          <dd className="text-foreground">{donation.user_id ? "회원 (연동됨)" : "비회원"}</dd>
        </dl>
      </section>

      {/* 처리 메타 */}
      <section className="rounded-lg border border-border bg-secondary/30 p-5 text-xs text-muted-foreground">
        <p>등록일시: {formatDateTime(donation.created_at)}</p>
        {donation.approved_at && (
          <p className="mt-1">처리일시: {formatDateTime(donation.approved_at)}</p>
        )}
        {donation.rejection_reason && (
          <p className="mt-1 text-destructive">
            반려 사유: {donation.rejection_reason}
          </p>
        )}
      </section>
    </div>
  )
}
