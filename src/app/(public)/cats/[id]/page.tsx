import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  Cake,
  CheckCircle2,
  Eye,
  HeartHandshake,
  Mars,
  Scale,
  Venus,
} from "lucide-react"

import { CatCard, getCat, listSimilarCats } from "@/features/cats"
import { LikeButton } from "@/shared/components/like-button"
import { PhotoGallery } from "@/shared/components/photo-gallery"
import { ShareButton } from "@/shared/components/share-button"
import { ViewTracker } from "@/shared/components/view-tracker"
import { Badge } from "@/shared/components/ui/badge"
import { buttonVariants } from "@/shared/components/ui/button"
import { formatAge } from "@/shared/lib/age"
import { cn } from "@/shared/lib/utils"

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const cat = await getCat(id)
  if (!cat) return { title: "찾을 수 없는 아이" }
  const cover = cat.images[cat.thumbnail_index] ?? cat.images[0]
  const desc =
    cat.description ?? `${cat.name} — 왕왕랜드에서 새 가족을 기다리는 아이입니다.`
  return {
    title: cat.name,
    description: desc,
    openGraph: {
      title: `${cat.name} · 왕왕랜드`,
      description: desc,
      type: "article",
      images: cover ? [{ url: cover, width: 1200, height: 630, alt: cat.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${cat.name} · 왕왕랜드`,
      description: desc,
      images: cover ? [cover] : undefined,
    },
  }
}

export default async function CatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cat = await getCat(id)

  if (!cat) notFound()

  const similar = await listSimilarCats({ id: cat.id, gender: cat.gender }, 4)
  const isAdoptable = cat.status === "보호중" || cat.status === "임시보호중"
  const ageLabel = formatAge(cat)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-10 md:px-6 md:pb-14 md:pt-14">
      <ViewTracker kind="cat" id={cat.id} />

      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/cats" className="hover:text-foreground">
          ← 고양이 목록
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <PhotoGallery
          images={cat.images}
          thumbnailIndex={cat.thumbnail_index}
          alt={cat.name}
          fallback="🐱"
        />

        <div className="space-y-5">
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge>{cat.status}</Badge>
              {cat.breed && (
                <span className="text-xs text-muted-foreground">{cat.breed}</span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="size-3.5" aria-hidden />
                {(cat.view_count ?? 0).toLocaleString()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {cat.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              왕왕랜드에서 새 가족을 기다리고 있어요
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LikeButton kind="cat" id={cat.id} initialCount={cat.like_count ?? 0} />
              <ShareButton
                title={`${cat.name} · 왕왕랜드`}
                text={`왕왕랜드에서 새 가족을 기다리는 ${cat.name} 을(를) 소개합니다.`}
                path={`/cats/${cat.id}`}
                label="공유"
              />
            </div>
          </header>

          {/* 퀵 칩 */}
          <div className="flex flex-wrap gap-1.5">
            {cat.gender && cat.gender !== "미상" && (
              <Chip
                icon={
                  cat.gender === "수컷" ? (
                    <Mars className="size-3.5 text-sky-600" aria-hidden />
                  ) : (
                    <Venus className="size-3.5 text-pink-500" aria-hidden />
                  )
                }
                label={cat.gender}
              />
            )}
            {ageLabel && <Chip icon={<Cake className="size-3.5" aria-hidden />} label={ageLabel} />}
            {cat.weight_kg != null && (
              <Chip icon={<Scale className="size-3.5" aria-hidden />} label={`${cat.weight_kg}kg`} />
            )}
            {cat.neutered === true && (
              <Chip
                icon={<CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />}
                label="중성화 완료"
              />
            )}
          </div>

          {/* 데스크탑 CTA */}
          <div className="hidden md:block">
            {isAdoptable ? (
              <Link
                href={`/adopt?catId=${cat.id}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full gap-2 shadow-md hover:shadow-lg"
                )}
              >
                <HeartHandshake className="size-4" aria-hidden />
                {cat.name} 입양 문의하기
              </Link>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                {cat.status === "입양완료"
                  ? `${cat.name}는 새 가족을 만났어요 💕`
                  : `${cat.name}는 무지개다리를 건넜어요 🌈`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 스토리 */}
      {(cat.personality || cat.health_info || cat.description) && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12">
          {cat.personality && (
            <StoryCard title="성격" emoji="✨">
              {cat.personality}
            </StoryCard>
          )}
          {cat.health_info && (
            <StoryCard title="건강 상태" emoji="🩺">
              {cat.health_info}
            </StoryCard>
          )}
          {cat.description && (
            <StoryCard
              title={`${cat.name} 이야기`}
              emoji="📖"
              className="sm:col-span-2"
            >
              {cat.description}
            </StoryCard>
          )}
        </section>
      )}

      {isAdoptable && (
        <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:mt-12 md:p-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-foreground">
            <HeartHandshake className="size-5 text-primary" aria-hidden />
            입양 절차
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            <Step n={1} title="입양 문의 폼 작성" desc="기본 정보·환경" />
            <Step n={2} title="운영진 상담" desc="전화·방문" />
            <Step n={3} title="입양 확정" desc="가정 점검 후 인도" />
          </ol>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-16 border-t border-border/60 pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground md:text-2xl">
                이런 친구도 있어요
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                비슷한 조건으로 새 가족을 기다리는 아이들이에요.
              </p>
            </div>
            <Link
              href="/cats"
              className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {similar.map((c) => (
              <CatCard key={c.id} cat={c} />
            ))}
          </div>
        </section>
      )}

      {/* 모바일 sticky CTA */}
      {isAdoptable && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
          <LikeButton kind="cat" id={cat.id} initialCount={cat.like_count ?? 0} />
          <ShareButton
            title={`${cat.name} · 왕왕랜드`}
            text={`왕왕랜드에서 새 가족을 기다리는 ${cat.name} 을(를) 소개합니다.`}
            path={`/cats/${cat.id}`}
          />
          <Link
            href={`/adopt?catId=${cat.id}`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "ml-auto flex-1 gap-1.5"
            )}
          >
            <HeartHandshake className="size-4" aria-hidden />
            입양 문의
          </Link>
        </div>
      )}
    </div>
  )
}

function Chip({
  icon,
  label,
}: {
  icon?: React.ReactNode
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
      {icon}
      {label}
    </span>
  )
}

function StoryCard({
  title,
  emoji,
  children,
  className,
}: {
  title: string
  emoji?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {emoji && <span aria-hidden>{emoji}</span>}
        {title}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {children}
      </p>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-background/60 p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}
