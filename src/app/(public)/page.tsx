import Link from "next/link"

import { countCatsByStatus, listCats } from "@/features/cats"
import { countDogsBySize, DogGrid, listDogs } from "@/features/dogs"
import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"
import type { DogSize } from "@/shared/types/database"

export const revalidate = 60

const DOG_SIZE_ORDER: DogSize[] = ["소", "중소", "중", "중대", "대", "대대"]

export default async function HomePage() {
  const [dogs, cats, dogSizeCounts, catStatusCounts] = await Promise.all([
    listDogs({ status: "보호중", limit: 8 }),
    listCats({ status: "보호중", limit: 4 }),
    countDogsBySize(),
    countCatsByStatus(),
  ])

  const dogTotal = DOG_SIZE_ORDER.reduce(
    (sum, size) => sum + dogSizeCounts[size],
    0
  ) + dogSizeCounts["미분류"]
  const catTotal = catStatusCounts["보호중"] + catStatusCounts["임시보호중"]

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 text-center md:px-6 md:py-28">
          <span className="rounded-full bg-accent/30 px-4 py-1 text-xs font-semibold text-accent-foreground">
            {SITE.subtitle}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {SITE.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            {SITE.name}은 아무런 이유로도 아이들의 생명을 포기하지 않습니다.
            <br />
            새로운 가족을 만날 때까지 사랑으로 돌봅니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dogs"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              입양 대기 아이들 보기
            </Link>
            <Link
              href="/about"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              {SITE.name} 소개
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              100% 안락사 없는 보호센터
            </h2>
            <p className="mt-3 text-muted-foreground">
              {SITE.name}은 어떠한 이유로도 아이들의 생명을 포기하지 않습니다.
              <br />
              새로운 가족을 만날 때까지 사랑으로 끝까지 책임집니다.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              왕왕랜드 현황
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              현재 보호 중인 아이들의 현황입니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatBlock
              title="🐶 강아지"
              totalLabel={`총 ${dogTotal}마리`}
              rows={[
                ...DOG_SIZE_ORDER.map((size) => ({
                  label: `${size}형`,
                  value: dogSizeCounts[size],
                })),
                ...(dogSizeCounts["미분류"] > 0
                  ? [{ label: "미분류", value: dogSizeCounts["미분류"] }]
                  : []),
              ]}
              href="/dogs"
            />
            <StatBlock
              title="🐱 고양이"
              totalLabel={`총 ${catTotal}마리`}
              rows={[
                { label: "보호중", value: catStatusCounts["보호중"] },
                { label: "임시보호중", value: catStatusCounts["임시보호중"] },
              ]}
              href="/cats"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                새 가족을 기다려요
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {SITE.name}에서 따뜻한 손길을 기다리고 있는 친구들입니다.
              </p>
            </div>
            <Link
              href="/dogs"
              className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
            >
              전체 보기 →
            </Link>
          </div>

          <DogGrid
            dogs={dogs}
            emptyMessage="아직 등록된 아이가 없어요. 곧 만나게 될 친구들을 준비 중입니다."
          />

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/dogs"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              전체 아이들 보기
            </Link>
          </div>
        </div>
      </section>

      {cats.length > 0 && (
        <section className="border-t border-border/60 bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                  고양이 친구들
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {SITE.name}의 냥이들입니다.
                </p>
              </div>
              <Link
                href="/cats"
                className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {cats.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/cats/${cat.id}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-background"
                >
                  <div className="flex aspect-square items-center justify-center bg-muted text-4xl">
                    🐱
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-foreground">{cat.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cat.breed ?? "고양이"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function StatBlock({
  title,
  totalLabel,
  rows,
  href,
}: {
  title: string
  totalLabel: string
  rows: { label: string; value: number }[]
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <span className="text-sm font-semibold text-primary">{totalLabel}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-md bg-background px-3 py-2 text-center"
          >
            <p className="text-[11px] text-muted-foreground">{row.label}</p>
            <p className="mt-0.5 text-base font-bold text-foreground">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </Link>
  )
}
