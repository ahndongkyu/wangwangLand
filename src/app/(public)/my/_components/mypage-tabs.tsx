"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"
import type { Donation } from "@/features/donations"

interface VolunteerApp {
  id: string
  status: ApplicationStatus
  submitted_at: string
  available_dates: string[]
}

interface AdoptionApp {
  id: string
  status: ApplicationStatus
  submitted_at: string
  dog: { name: string }[] | null
  cat: { name: string }[] | null
}

interface LikedAnimal {
  id: string
  name: string
  status: string
  images: string[]
  thumbnail_index: number
  kind: "dog" | "cat"
}

interface Props {
  volunteers: VolunteerApp[]
  adoptions: AdoptionApp[]
  donations: Donation[]
  likedAnimals: LikedAnimal[]
}

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  접수: "bg-primary/15 text-primary",
  검토중: "bg-amber-100 text-amber-700",
  승인: "bg-emerald-100 text-emerald-700",
  반려: "bg-muted text-muted-foreground",
  취소: "bg-muted text-muted-foreground",
  일정변경요청: "bg-blue-100 text-blue-700",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  })
}

export function MyPageTabs({ volunteers, adoptions, donations, likedAnimals }: Props) {
  const [active, setActive] = useState<"apps" | "donations" | "likes">("apps")

  const totalApps = volunteers.length + adoptions.length
  const tabs = [
    { key: "apps" as const, label: "신청 내역", count: totalApps },
    { key: "donations" as const, label: "후원 내역", count: donations.length },
    { key: "likes" as const, label: "찜한 아이들", count: likedAnimals.length },
  ]

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
      {/* 탭 헤더 */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-colors",
              active === tab.key
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                active === tab.key
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 신청 내역 */}
      {active === "apps" && (
        <div>
          {totalApps === 0 ? (
            <EmptyState icon="📋" message="신청 내역이 없습니다." href="/calendar" cta="봉사 일정 보기" />
          ) : (
            <div className="divide-y divide-border">
              {volunteers.map((v) => (
                <Link key={v.id} href="/my/applications" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base">
                    ✋
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">봉사 신청</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.available_dates.length > 0
                        ? v.available_dates[0]
                        : formatDate(v.submitted_at)}{" "}
                      신청
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold", STATUS_STYLE[v.status])}>
                    {v.status}
                  </span>
                </Link>
              ))}
              {adoptions.map((a) => (
                <Link key={a.id} href="/my/applications" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-base">
                    🏠
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      입양 신청 — {a.dog?.[0]?.name ?? a.cat?.[0]?.name ?? "아이"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(a.submitted_at)} 신청</p>
                  </div>
                  <span className={cn("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold", STATUS_STYLE[a.status])}>
                    {a.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 후원 내역 */}
      {active === "donations" && (
        <div>
          {donations.length === 0 ? (
            <EmptyState icon="❤️" message="후원 내역이 없습니다." href="/donate" cta="후원하기" />
          ) : (
            <div className="divide-y divide-border">
              {donations.map((d) => (
                <Link key={d.id} href="/my/donations" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-base">
                    {d.type === "cash" ? "💰" : "📦"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {d.type === "cash"
                        ? `${(d.amount ?? 0).toLocaleString()}원`
                        : [d.item_description, d.item_quantity].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(d.donated_at)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold",
                      d.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : d.status === "pending"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {d.status === "approved" ? "승인" : d.status === "pending" ? "접수" : d.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 찜한 아이들 */}
      {active === "likes" && (
        <div>
          {likedAnimals.length === 0 ? (
            <EmptyState icon="⭐" message="찜한 아이가 없습니다." href="/dogs" cta="아이들 보러 가기" />
          ) : (
            <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4">
              {likedAnimals.map((animal) => {
                const thumbnailSrc =
                  animal.images[animal.thumbnail_index] ?? animal.images[0] ?? null
                return (
                  <Link
                    key={`${animal.kind}:${animal.id}`}
                    href={`/${animal.kind === "dog" ? "dogs" : "cats"}/${animal.id}`}
                    className="group overflow-hidden rounded-xl border border-border bg-muted transition-all hover:border-primary/40 hover:shadow-sm"
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
                    <p className="truncate px-2 py-1.5 text-xs font-semibold text-foreground">{animal.name}</p>
                  </Link>
                )
              })}
            </div>
          )}
          {likedAnimals.length > 0 && (
            <div className="border-t border-border px-5 py-3 text-right">
              <Link href="/my/likes" className="text-xs font-medium text-primary hover:underline">
                전체 보기 →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  icon,
  message,
  href,
  cta,
}: {
  icon: string
  message: string
  href: string
  cta: string
}) {
  return (
    <div className="flex flex-col items-center py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary text-3xl">
        {icon}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      <Link
        href={href}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  )
}
