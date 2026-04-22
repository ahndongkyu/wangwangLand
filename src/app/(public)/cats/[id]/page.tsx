import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Eye } from "lucide-react"

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
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

        <div className="space-y-6">
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge>{cat.status}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="size-3.5" aria-hidden />
                {(cat.view_count ?? 0).toLocaleString()}회 조회
              </span>
            </div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {cat.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[cat.breed, formatAge(cat)].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LikeButton
                kind="cat"
                id={cat.id}
                initialCount={cat.like_count ?? 0}
              />
              <ShareButton
                title={`${cat.name} · 왕왕랜드`}
                text={`왕왕랜드에서 새 가족을 기다리는 ${cat.name} 을(를) 소개합니다.`}
                path={`/cats/${cat.id}`}
                label="공유"
              />
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5">
            <InfoRow label="성별" value={cat.gender} />
            <InfoRow label="나이" value={formatAge(cat)} />
            <InfoRow
              label="몸무게"
              value={cat.weight_kg != null ? `${cat.weight_kg}kg` : "-"}
            />
            <InfoRow
              label="중성화"
              value={
                cat.neutered === true
                  ? "완료"
                  : cat.neutered === false
                    ? "미완료"
                    : "미상"
              }
            />
          </dl>

          {cat.personality && (
            <Section title="성격">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {cat.personality}
              </p>
            </Section>
          )}

          {cat.health_info && (
            <Section title="건강 상태">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {cat.health_info}
              </p>
            </Section>
          )}

          {cat.description && (
            <Section title="소개 · 특이사항">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {cat.description}
              </p>
            </Section>
          )}

          {cat.status === "보호중" || cat.status === "임시보호중" ? (
            <Link
              href={`/adopt?catId=${cat.id}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              {cat.name} 입양 문의하기
            </Link>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              {cat.status === "입양완료"
                ? "이미 새 가족을 만난 아이예요 💕"
                : "무지개다리를 건넌 아이예요 🌈"}
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}
