"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export interface HeroSlideCTA {
  label: string
  href: string
  external?: boolean
}

export interface HeroSlide {
  /** public/ 기준 경로 또는 절대 URL */
  image: string
  badge?: string
  title: string
  description: string
  primary: HeroSlideCTA
  secondary?: HeroSlideCTA
}

interface Props {
  slides: HeroSlide[]
  /** 자동 슬라이드 간격 (ms). 기본 5000 */
  interval?: number
  /** 자동 재생 초기 상태. 기본 true */
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
    (next: number) => {
      setIndex(((next % count) + count) % count)
    },
    [count]
  )

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % count)
  }, [count])

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count)
  }, [count])

  // 자동 재생
  useEffect(() => {
    if (!playing || count < 2) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, interval)
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
    const endX = e.changedTouches[0].clientX
    const dx = endX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  if (count === 0) return null

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="메인 배너"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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
          <button
            type="button"
            onClick={prev}
            aria-label="이전 슬라이드"
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground shadow-md backdrop-blur-sm transition hover:bg-background/90 md:left-4"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="다음 슬라이드"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground shadow-md backdrop-blur-sm transition hover:bg-background/90 md:right-4"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-background/70 px-3 py-1.5 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`${i + 1}번째 슬라이드로 이동`}
                  aria-current={i === index}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index
                      ? "w-6 bg-primary"
                      : "w-2 bg-foreground/40 hover:bg-foreground/60"
                  )}
                />
              ))}
            </div>
            <span className="h-3 w-px bg-foreground/20" />
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "자동 슬라이드 정지" : "자동 슬라이드 재생"}
              aria-pressed={playing}
              className="text-foreground/80 hover:text-foreground"
            >
              {playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </button>
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

function CTALink({
  cta,
  variant,
}: {
  cta: HeroSlideCTA
  variant: "primary" | "outline"
}) {
  const className = cn(
    buttonVariants({
      size: "lg",
      variant: variant === "outline" ? "outline" : "default",
    }),
    variant === "outline" && "bg-background/90 backdrop-blur-sm"
  )

  if (cta.external) {
    return (
      <a
        href={cta.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {cta.label}
      </a>
    )
  }

  return (
    <Link href={cta.href} className={className}>
      {cta.label}
    </Link>
  )
}
