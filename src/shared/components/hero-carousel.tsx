"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export interface HeroSlideCTA {
  label: string
  href: string
  external?: boolean
}

export interface HeroSlide {
  image: string
  badge?: string
  title: string
  description: string
  primary: HeroSlideCTA
  secondary?: HeroSlideCTA
}

interface Props {
  slides: HeroSlide[]
  interval?: number
  autoPlayInitial?: boolean
}

export function HeroCarousel({
  slides,
  interval = 5000,
  autoPlayInitial = true,
}: Props) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(autoPlayInitial)
  const touchStartX = useRef<number | null>(null)
  const count = slides.length

  const goTo = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  )
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count])

  // 자동 재생
  useEffect(() => {
    if (!playing || count < 2) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval)
    return () => window.clearInterval(id)
  }, [playing, count, interval])

  // 키보드 좌/우
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev()
      else if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [prev, next])

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
    touchStartX.current = null
  }

  if (count === 0) return null

  return (
    <section
      className="relative min-h-[420px] overflow-hidden md:min-h-[560px]"
      aria-roledescription="carousel"
      aria-label="메인 배너"
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 슬라이드 트랙 */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <SlideView key={i} slide={slide} active={i === index} />
        ))}
      </div>

      {count > 1 && (
        <>
          {/* 화살표 — 모바일 숨김 */}
          <button
            type="button"
            onClick={prev}
            aria-label="이전 슬라이드"
            className={cn(
              "absolute left-6 z-20 hidden md:flex",
              "top-[55%] -translate-y-1/2",
              "size-11 items-center justify-center rounded-2xl",
              "bg-white/70 shadow-md backdrop-blur-sm",
              "transition-transform duration-150 hover:scale-110 hover:bg-white/90"
            )}
          >
            <ChevronLeft className="size-5 stroke-[1.5] text-foreground" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="다음 슬라이드"
            className={cn(
              "absolute right-6 z-20 hidden md:flex",
              "top-[55%] -translate-y-1/2",
              "size-11 items-center justify-center rounded-2xl",
              "bg-white/70 shadow-md backdrop-blur-sm",
              "transition-transform duration-150 hover:scale-110 hover:bg-white/90"
            )}
          >
            <ChevronRight className="size-5 stroke-[1.5] text-foreground" />
          </button>

          {/* 인디케이터 도트 */}
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번째 슬라이드로 이동`}
                aria-current={i === index}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === index
                    ? "h-2 w-6 bg-white shadow-sm"
                    : "size-2 bg-white/50 hover:bg-white/75"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function SlideView({ slide, active }: { slide: HeroSlide; active: boolean }) {
  return (
    <div
      className="relative w-full flex-shrink-0"
      aria-hidden={!active}
      role="group"
      aria-roledescription="slide"
    >
      <Image
        src={slide.image}
        alt=""
        fill
        priority={active}
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/30" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 pb-24 text-center md:px-6 md:py-28 md:pb-32">
        {slide.badge && (
          <span className="rounded-full bg-background/80 px-4 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
            {slide.badge}
          </span>
        )}
        <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl [text-shadow:_0_2px_8px_rgb(245_239_228_/_50%)]">
          {slide.title}
        </h1>
        <p className="mt-5 max-w-xl whitespace-pre-line text-base font-medium text-foreground md:text-lg [text-shadow:_0_1px_4px_rgb(245_239_228_/_80%)]">
          {slide.description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CTALink cta={slide.primary} variant="primary" />
          {slide.secondary && (
            <CTALink cta={slide.secondary} variant="outline" />
          )}
        </div>
      </div>
    </div>
  )
}

function CTALink({ cta, variant }: { cta: HeroSlideCTA; variant: "primary" | "outline" }) {
  const className = cn(
    buttonVariants({
      size: "lg",
      variant: variant === "outline" ? "outline" : "default",
    }),
    "h-11 px-6 text-base font-semibold",
    variant === "primary" &&
      "shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5",
    variant === "outline" &&
      "border-2 bg-background/90 backdrop-blur-sm transition-transform hover:-translate-y-0.5"
  )

  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className}>
        {cta.label}
      </a>
    )
  }

  return <Link href={cta.href} className={className}>{cta.label}</Link>
}
