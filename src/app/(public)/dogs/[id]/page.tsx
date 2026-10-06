import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { DogCard, getDog, listSimilarDogs } from "@/features/dogs"
import { LikeButton } from "@/shared/components/like-button"
import { PhotoGallery } from "@/shared/components/photo-gallery"
import { ShareButton } from "@/shared/components/share-button"
import { ViewTracker } from "@/shared/components/view-tracker"
import { buttonVariants } from "@/shared/components/ui/button"
import { formatAge } from "@/shared/lib/age"
import { createClient } from "@/shared/lib/supabase/server"
import { cn } from "@/shared/lib/utils"

export const revalidate = 60

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

  const [similar, likedByUser] = await Promise.all([
    listSimilarDogs({ id: dog.id, size: dog.size, gender: dog.gender }, 4),
    (async () => {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return undefined
      const { data } = await supabase.rpc("check_dog_liked", { p_dog_id: dog.id })
      return data === true ? true : false
    })(),
  ])

  const isAdoptable = dog.status === "보호중" || dog.status === "임시보호중"
  const ageLabel = formatAge(dog)

  const statusText = isAdoptable ? "새 가족과의 만남을 기다리고 있어요." : dog.status === "입양완료" ? "새 가족을 만나 함께 지내고 있어요." : "함께했던 시간을 기억합니다."
  const facts = [
    ["성별", dog.gender !== "미상" ? dog.gender : null],
    ["나이", ageLabel],
    ["크기", dog.size ? `${dog.size}형` : null],
    ["몸무게", dog.weight_kg != null ? `${dog.weight_kg}kg` : null],
    ["중성화", dog.neutered === true ? "완료" : dog.neutered === false ? "미완료" : null],
  ].filter(([, value]) => value)
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-7 md:px-6 md:pb-14 md:pt-10">
      <ViewTracker kind="dog" id={dog.id} />
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground" aria-label="현재 위치">
        <Link href="/dogs" className="inline-flex min-h-11 items-center hover:text-primary">가족을 기다리는 아이들</Link><span aria-hidden>/</span><span className="truncate text-foreground">{dog.name}</span>
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div>
          <PhotoGallery images={dog.images} thumbnailIndex={dog.thumbnail_index} alt={dog.name} fallback={<span className="text-sm text-muted-foreground">사진을 준비하고 있어요</span>} />
          <p className="mt-3 text-xs text-muted-foreground">사진을 누르면 크게 볼 수 있어요.</p>
        </div>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7" aria-label="아이 소개">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">{dog.status}</span>
            <span className="text-xs tabular-nums text-muted-foreground">조회 {(dog.view_count ?? 0).toLocaleString()}</span>
          </div>
          <h1 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{dog.name}</h1>
          {dog.breed && <p className="mt-2 text-sm text-muted-foreground">{dog.breed}</p>}
          <p className="mt-5 text-sm leading-6 text-foreground/80">{statusText}</p>
          {facts.length > 0 && <dl className="my-6 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-border py-5 sm:grid-cols-3">{facts.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1.5 text-sm font-semibold text-foreground">{value}</dd></div>)}</dl>}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <LikeButton kind="dog" id={dog.id} initialCount={dog.like_count ?? 0} initialLiked={likedByUser} className="h-11" />
            <ShareButton title={`${dog.name} · 왕왕랜드`} text={`왕왕랜드의 ${dog.name}을 소개합니다.`} path={`/dogs/${dog.id}`} label="공유하기" />
          </div>
          {isAdoptable ? <div className="hidden md:block"><Link href={`/adopt?dogId=${dog.id}`} className={cn(buttonVariants({ size: "lg" }), "min-h-12 w-full")}>{dog.name} 입양 문의하기</Link><p className="mt-3 text-center text-xs leading-5 text-muted-foreground">문의 내용을 확인한 뒤 운영진이 안내해 드립니다.</p></div> : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{dog.status === "입양완료" ? "입양이 완료된 아이입니다." : "이 아이의 기록을 간직하고 있어요."}</p>}
        </section>
      </div>
      {(dog.description || dog.personality || dog.health_info) && <section className="mt-10 space-y-5 md:mt-12" aria-label="아이에 대해 알아보기">
        {dog.description && <StoryCard title={`${dog.name} 이야기`}>{dog.description}</StoryCard>}
        <div className="grid gap-5 md:grid-cols-2">
          {dog.personality && <StoryCard title="성격과 생활">{dog.personality}</StoryCard>}
          {dog.health_info && <StoryCard title="건강 상태">{dog.health_info}</StoryCard>}
        </div>
      </section>}
      {isAdoptable && <section className="mt-10 rounded-2xl border border-border bg-secondary/40 p-5 md:p-7">
        <div className="mb-6"><p className="mb-2 text-xs font-medium text-primary">함께하기 전 알아두세요</p><h2 className="text-xl font-bold tracking-tight">가족이 되는 과정</h2></div>
        <ol className="grid gap-5 sm:grid-cols-3">
          <Step n="01" title="입양 문의" desc="기본 정보와 함께 생활할 환경을 알려주세요." />
          <Step n="02" title="운영진 상담" desc="전화·방문 상담으로 서로를 알아가요." />
          <Step n="03" title="입양 확정" desc="가정 점검 후 새로운 시작을 준비해요." />
        </ol>
      </section>}
      {similar.length > 0 && <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-bold tracking-tight">함께 만나보세요</h2><Link href="/dogs" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">전체 보기 →</Link></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{similar.map(d => <DogCard key={d.id} dog={d} />)}</div>
      </section>}
      {isAdoptable && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:hidden">
        <Link href={`/adopt?dogId=${dog.id}`} className={cn(buttonVariants({ size: "lg" }), "min-h-12 w-full")}>{dog.name} 입양 문의하기</Link>
      </div>}
    </div>
  )
}

function StoryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5 md:p-7"><h2 className="mb-4 text-lg font-bold tracking-tight">{title}</h2><p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">{children}</p></div>
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return <li><span className="text-xs font-semibold tracking-widest text-primary">{n}</span><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{desc}</p></li>
}
