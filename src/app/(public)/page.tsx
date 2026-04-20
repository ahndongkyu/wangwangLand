import Link from "next/link"

import { DogGrid, listDogs } from "@/features/dogs"
import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

export const revalidate = 60

export default async function HomePage() {
  const dogs = await listDogs({ status: "보호중", limit: 8 })

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 text-center md:px-6 md:py-28">
          <span className="rounded-full bg-accent/30 px-4 py-1 text-xs font-semibold text-accent-foreground">
            안락사 없는 유기견 보호소
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

      <section className="bg-background">
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
    </>
  )
}
