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

const GAP = 12 // px between slides

export function HeroCarousel({
  slides,
  interval = 5000,
  autoPlayInitial = true,
}: Props) {
  const count = slides.length

  // 클론 포함 슬라이드: [last, ...slides, first]
  const cloned = count > 1 ? [slides[count - 1], ...slides, slides[0]] : slides

  // virtualIdx: 1 = 첫 번째 실제 슬라이드
  const [virtualIdx, setVirtualIdx] = useState(count > 1 ? 1 : 0)
  const [animated, setAnimated] = useState(true)
  const [playing, setPlaying] = useState(autoPlayInitial)
  const [slideW, setSlideW] = useState(0)
  const [leftPad, setLeftPad] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const touchStartX = useRef<number | null>(null)
  const isSnapping = useRef(false)

  // 실제 슬라이드 인덱스 (도트용)
  const realIndex = count > 1 ? virtualIdx - 1 : virtualIdx

  // 컨테이너 폭 측정
  useEffect(() => {
    function measure() {
      if (!sectionRef.current) return
      const w = sectionRef.current.offsetWidth
      const sw = Math.round(w * (w < 768 ? 0.80 : 0.78))
      setLeftPad(Math.round((w - sw) / 2))
      setSlideW(sw)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (sectionRef.current) ro.observe(sectionRef.current)
    return () => ro.disconnect()
  }, [])

  // 클론 끝에 닿으면 애니메이션 없이 진짜 슬라이드로 점프
  useEffect(() => {
    if (count <= 1) return
    if (virtualIdx === 0 || virtualIdx === cloned.length - 1) {
      isSnapping.current = true
      const timer = setTimeout(() => {
        setAnimated(false)
        setVirtualIdx(virtualIdx === 0 ? count : 1)
        // 다음 프레임에 애니메이션 다시 켜기
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimated(true)
            isSnapping.current = false
          })
        })
      }, 500) // transition duration과 맞춤
      return () => clearTimeout(timer)
    }
  }, [virtualIdx, count, cloned.length])

  const next = useCallback(() => {
    if (isSnapping.current) return
    setAnimated(true)
    setVirtualIdx((i) => i + 1)
  }, [])

  const prev = useCallback(() => {
    if (isSnapping.current) return
    setAnimated(true)
    setVirtualIdx((i) => i - 1)
  }, [])

  const goTo = useCallback((realI: number) => {
    if (isSnapping.current) return
    setAnimated(true)
    setVirtualIdx(count > 1 ? realI + 1 : realI)
  }, [count])

  // 자동 재생
  useEffect(() => {
    if (!playing || count < 2) return
    const id = window.setInterval(next, interval)
    return () => window.clearInterval(id)
  }, [playing, count, interval, next])

  // 키보드
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

  const translateX = slideW ? -(virtualIdx * (slideW + GAP)) : 0

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-4"
      aria-roledescription="carousel"
      aria-label="메인 배너"
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 슬라이드 트랙 */}
      <div
        className="flex h-[260px] sm:h-[320px] md:h-[480px] lg:h-[560px] xl:h-[640px] 2xl:h-[720px]"
        style={{
          gap: `${GAP}px`,
          paddingLeft: `${leftPad}px`,
          transform: `translateX(${translateX}px)`,
          transition: animated ? "transform 500ms ease-out" : "none",
        }}
      >
        {cloned.map((slide, i) => {
          const isActive = i === virtualIdx
          return (
            <div
              key={i}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="slide"
              className="relative flex-shrink-0 overflow-hidden rounded-2xl"
              style={{
                width: slideW > 0 ? `${slideW}px` : "80%",
                transform: isActive ? "scale(1)" : "scale(0.88)",
                transition: animated ? "transform 500ms ease-out" : "none",
                transformOrigin: "center center",
              }}
            >
              <Image
                src={slide.image}
                alt=""
                fill
                priority={i === 1}
                sizes="90vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/60" />

              {/* 텍스트 + CTA */}
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-10 text-center">
                {slide.badge && (
                  <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
                    {slide.badge}
                  </span>
                )}
                <h1 className="mt-4 text-xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl [text-shadow:_0_2px_12px_rgb(0_0_0_/_60%)]">
                  {slide.title}
                </h1>
                <p className="mt-3 max-w-xl whitespace-pre-line text-sm font-medium text-white/90 md:text-base [text-shadow:_0_1px_4px_rgb(0_0_0_/_30%)]">
                  {slide.description}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <CTALink cta={slide.primary} variant="primary" />
                  {slide.secondary && (
                    <CTALink cta={slide.secondary} variant="outline" />
                  )}
                </div>
              </div>

              {/* 인디케이터 도트 — 활성 슬라이드 내부 */}
              {count > 1 && isActive && (
                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
                  {slides.map((_, di) => (
                    <button
                      key={di}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goTo(di) }}
                      aria-label={`${di + 1}번째 슬라이드로 이동`}
                      aria-current={di === realIndex}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        di === realIndex
                          ? "h-2 w-6 bg-white shadow-sm"
                          : "size-2 bg-white/50 hover:bg-white/75"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 화살표 — 데스크탑만, 슬라이드 안쪽 */}
      {count > 1 && slideW > 0 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="이전 슬라이드"
            className={cn(
              "absolute top-1/2 z-20 hidden -translate-y-1/2 md:flex",
              "size-10 items-center justify-center rounded-full",
              "border border-white/30 bg-white/15 shadow-xl backdrop-blur-md",
              "text-white transition-all duration-200 hover:scale-105 hover:bg-white/25"
            )}
            style={{ left: leftPad + 16 }}
          >
            <ChevronLeft className="size-5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="다음 슬라이드"
            className={cn(
              "absolute top-1/2 z-20 hidden -translate-y-1/2 md:flex",
              "size-10 items-center justify-center rounded-full",
              "border border-white/30 bg-white/15 shadow-xl backdrop-blur-md",
              "text-white transition-all duration-200 hover:scale-105 hover:bg-white/25"
            )}
            style={{ right: leftPad + 16 }}
          >
            <ChevronRight className="size-5 stroke-[1.5]" />
          </button>
        </>
      )}
    </section>
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
    "h-11 px-6 text-base font-semibold",
    variant === "primary" &&
      "shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5",
    variant === "outline" &&
      "border-2 bg-white/80 backdrop-blur-sm transition-transform hover:-translate-y-0.5"
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
