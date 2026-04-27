import Link from "next/link"
import { redirect } from "next/navigation"

import {
  listMyDonations,
  DonationStatusBadge,
  DonationCancelButton,
} from "@/features/donations"
import { getCurrentProfile } from "@/features/members"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatAmount(donation: { type: string; amount: number | null; item_description: string | null; item_quantity: string | null }) {
  if (donation.type === "cash") {
    return `${(donation.amount ?? 0).toLocaleString()}원`
  }
  return [donation.item_description, donation.item_quantity].filter(Boolean).join(" · ")
}

export default async function MyDonationsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login?redirect=/my/donations")

  const donations = await listMyDonations()
  const approvedCash = donations
    .filter((d) => d.status === "approved" && d.type === "cash")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const approvedGoods = donations.filter(
    (d) => d.status === "approved" && d.type === "goods"
  ).length

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/my" className="hover:text-foreground">
            ← 마이페이지
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          내 후원 내역
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          기록완료된 내역은 추후 기부금영수증 발급 시 일괄 안내드릴 예정입니다.
        </p>
      </header>

      {/* 요약 */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">기록완료된 누적 후원금</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {approvedCash.toLocaleString()}<span className="ml-1 text-sm font-normal text-muted-foreground">원</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">기록완료된 누적 물품</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {approvedGoods}<span className="ml-1 text-sm font-normal text-muted-foreground">건</span>
          </p>
        </div>
      </section>

      {/* 내역 */}
      {donations.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            아직 등록된 후원 내역이 없어요.
          </p>
          <Link href="/donate/register" className={cn(buttonVariants())}>
            후원 등록하기
          </Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-card">
          {donations.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
                    {d.type === "cash" ? "현금" : "물품"}
                  </span>
                  <DonationStatusBadge status={d.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(d.donated_at)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatAmount(d)}
                </p>
                {d.message && (
                  <p className="truncate text-xs text-muted-foreground">
                    “{d.message}”
                  </p>
                )}
                {d.status === "rejected" && d.rejection_reason && (
                  <p className="text-xs text-destructive">
                    반려 사유: {d.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {d.status === "pending" && <DonationCancelButton id={d.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
