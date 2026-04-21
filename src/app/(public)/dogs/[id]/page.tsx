import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getDog } from "@/features/dogs"
import { PhotoGallery } from "@/shared/components/photo-gallery"
import { Badge } from "@/shared/components/ui/badge"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const revalidate = 60

function formatAge(months: number | null) {
  if (months == null) return "나이 미상"
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years}살`
  return `${years}살 ${remainingMonths}개월`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("ko-KR")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const dog = await getDog(id)
  if (!dog) return { title: "찾을 수 없는 아이" }
  const cover = dog.images[dog.thumbnail_index] ?? dog.images[0]
  const desc =
    dog.description ?? `${dog.name} — 왕왕랜드에서 새 가족을 기다리는 아이입니다.`
  return {
    title: dog.name,
    description: desc,
    openGraph: {
      title: `${dog.name} · 왕왕랜드`,
      description: desc,
      type: "article",
      images: cover ? [{ url: cover, width: 1200, height: 630, alt: dog.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${dog.name} · 왕왕랜드`,
      description: desc,
      images: cover ? [cover] : undefined,
    },
  }
}

export default async function DogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dog = await getDog(id)

  if (!dog) notFound()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/dogs" className="hover:text-foreground">
          ← 아이들 목록
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <PhotoGallery
          images={dog.images}
          thumbnailIndex={dog.thumbnail_index}
          alt={dog.name}
          fallback="🐾"
        />

        <div className="space-y-6">
          <header>
            <Badge className="mb-3">{dog.status}</Badge>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {dog.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[dog.breed, formatAge(dog.age_months)].filter(Boolean).join(" · ")}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5">
            <InfoRow label="성별" value={dog.gender} />
            <InfoRow label="나이" value={formatAge(dog.age_months)} />
            <InfoRow
              label="몸무게"
              value={dog.weight_kg != null ? `${dog.weight_kg}kg` : "-"}
            />
            <InfoRow label="구조일" value={formatDate(dog.rescue_date)} />
          </dl>

          {dog.personality && (
            <Section title="성격">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {dog.personality}
              </p>
            </Section>
          )}

          {dog.health_info && (
            <Section title="건강 상태">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {dog.health_info}
              </p>
            </Section>
          )}

          {dog.description && (
            <Section title="소개">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {dog.description}
              </p>
            </Section>
          )}

          {dog.status === "보호중" || dog.status === "임시보호중" ? (
            <Link
              href={`/adopt?dogId=${dog.id}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              {dog.name} 입양 문의하기
            </Link>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              {dog.status === "입양완료"
                ? "이미 새 가족을 만난 아이예요 💕"
                : "무지개다리를 건넌 아이예요 🌈"}
            </div>
          )}
        </div>
      </div>
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
