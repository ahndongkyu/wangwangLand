import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getCat } from "@/features/cats"
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
  const cat = await getCat(id)
  if (!cat) return { title: "찾을 수 없는 아이" }
  return {
    title: cat.name,
    description: cat.description ?? `${cat.name}의 프로필 페이지입니다.`,
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

  const images = cat.images.length > 0 ? cat.images : []
  const mainImage = images[cat.thumbnail_index] ?? images[0] ?? null
  const otherImages = images.filter((_, idx) => idx !== cat.thumbnail_index)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/cats" className="hover:text-foreground">
          ← 고양이 목록
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={cat.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-7xl">
                🐱
              </div>
            )}
          </div>
          {otherImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {otherImages.slice(0, 4).map((src, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={src}
                    alt={`${cat.name} ${idx + 2}`}
                    fill
                    sizes="(max-width: 768px) 25vw, 12vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <header>
            <Badge className="mb-3">{cat.status}</Badge>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {cat.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[cat.breed, formatAge(cat.age_months)].filter(Boolean).join(" · ")}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5">
            <InfoRow label="성별" value={cat.gender} />
            <InfoRow label="나이" value={formatAge(cat.age_months)} />
            <InfoRow
              label="몸무게"
              value={cat.weight_kg != null ? `${cat.weight_kg}kg` : "-"}
            />
            <InfoRow label="구조일" value={formatDate(cat.rescue_date)} />
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
            <Section title="소개">
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
