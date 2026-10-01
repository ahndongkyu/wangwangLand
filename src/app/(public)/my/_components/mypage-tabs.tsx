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

export interface MyPostItem {
  id: string
  title: string
  date: string
  label: string
  href: string
  kind: "daily" | "story"
}

interface Props {
  volunteers: VolunteerApp[]
  adoptions: AdoptionApp[]
  donations: Donation[]
  likedAnimals: LikedAnimal[]
  myPosts: MyPostItem[]
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

export function MyPageTabs({ volunteers, adoptions, donations, likedAnimals, myPosts }: Props) {
  const [active, setActive] = useState<"apps" | "posts" | "donations" | "likes">("apps")

  const totalApps = volunteers.length + adoptions.length
  const tabs = [
    { key: "apps" as const, label: "신청 내역", count: totalApps },
    { key: "posts" as const, label: "내가 쓴 글", count: myPosts.length },
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
              "flex min-h-11 flex-1 flex-wrap items-center justify-center gap-1.5 px-1 py-3.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none",
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
            <EmptyState message="신청 내역이 없습니다." href="/calendar" cta="봉사 일정 보기" />
          ) : (
            <div className="divide-y divide-border">
              {volunteers.map((v) => (
                <Link key={v.id} href="/my/applications" className="flex items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-primary/15 motion-reduce:transition-none">
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
                <Link key={a.id} href="/my/applications" className="flex items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-primary/15 motion-reduce:transition-none">
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

      {/* 내가 쓴 글 */}
      {active === "posts" && (
        <div>
          {myPosts.length === 0 ? (
            <EmptyState message="아직 작성한 글이 없습니다." href="/daily/new" cta="첫 글 쓰기" />
          ) : (
            <div className="divide-y divide-border">
              {myPosts.map((post) => (
                <Link
                  key={`${post.kind}:${post.id}`}
                  href={post.href}
                  className="flex items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-primary/15 motion-reduce:transition-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {post.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {post.label} · {formatDate(post.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-primary">보기</span>
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
            <EmptyState message="후원 내역이 없습니다." href="/donate" cta="후원하기" />
          ) : (
            <div className="divide-y divide-border">
              {donations.map((d) => (
                <Link key={d.id} href="/my/donations" className="flex items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-primary/15 motion-reduce:transition-none">
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
            <EmptyState message="찜한 아이가 없습니다." href="/dogs" cta="아이들 보러 가기" />
          ) : (
            <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4">
              {likedAnimals.map((animal) => {
                const thumbnailSrc =
                  animal.images[animal.thumbnail_index] ?? animal.images[0] ?? null
                return (
                  <Link
                    key={`${animal.kind}:${animal.id}`}
                    href={`/${animal.kind === "dog" ? "dogs" : "cats"}/${animal.id}`}
                    className="group overflow-hidden rounded-xl border border-border bg-muted transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      {thumbnailSrc ? (
                        <Image
                          src={thumbnailSrc}
                          alt={animal.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                          사진 준비 중
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
  message,
  href,
  cta,
}: {
  message: string
  href: string
  cta: string
}) {
  return (
    <div className="flex flex-col items-center py-12">
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:opacity-80 motion-reduce:transition-none"
      >
        {cta}
      </Link>
    </div>
  )
}
