"use client"

import { useEffect, useRef, useState } from "react"

function FloatBtn({
  href,
  label,
  children,
  className,
  onClick,
}: {
  href?: string
  label: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const inner = (
    <div className="group relative flex items-center justify-end">
      {/* 툴팁 — 왼쪽에 나타남 (우측 배치이므로) */}
      <span className="pointer-events-none absolute right-[52px] whitespace-nowrap rounded-md bg-[#2B2B2B]/90 px-2.5 py-1 text-[12px] font-medium text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 dark:bg-white/90 dark:text-[#2B2B2B]">
        {label}
      </span>
      <span className={className}>{children}</span>
    </div>
  )

  if (onClick) {
    return (
      <button type="button" aria-label={label} onClick={onClick} className="block">
        {inner}
      </button>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="block">
      {inner}
    </a>
  )
}

export function KakaoChannelButton() {
  const [visible, setVisible] = useState(true)
  const [showTop, setShowTop] = useState(false)
  const lastScrollY = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY
      setShowTop(current > 200)

      if (current > lastScrollY.current + 8) setVisible(false)
      if (current < lastScrollY.current - 4) setVisible(true)
      lastScrollY.current = current

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), 1000)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const btnClass = "flex size-11 items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5 hover:border-black/[0.15] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-[#2B2B2B]"

  return (
    <div
      className={`fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2.5 transition-all duration-300 md:bottom-6 md:right-6 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0 pointer-events-none"
      }`}
    >
      {/* 카카오 */}
      <FloatBtn
        href="http://pf.kakao.com/_iTmxbX/chat"
        label="카카오톡 문의하기"
        className="kakao-float-btn flex size-11 items-center justify-center rounded-full bg-[#FEE500] shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.16)]"
      >
        <svg className="kakao-puppy" width="26" height="26" viewBox="0 0 60 60" fill="none" aria-hidden="true">
          <ellipse cx="18" cy="18" rx="6.5" ry="9.5" fill="#F5E0B8" stroke="#2B2B2B" strokeWidth="2.2" transform="rotate(-18 18 18)" />
          <ellipse cx="42" cy="17" rx="6.5" ry="9.5" fill="#F5E0B8" stroke="#2B2B2B" strokeWidth="2.2" transform="rotate(22 42 17)" />
          <ellipse cx="30" cy="32" rx="15" ry="14" fill="#F5E0B8" stroke="#2B2B2B" strokeWidth="2.2" />
          <ellipse cx="25" cy="30" rx="1.5" ry="2" fill="#2B2B2B" />
          <ellipse cx="35" cy="30" rx="1.5" ry="2" fill="#2B2B2B" />
          <ellipse cx="30" cy="35.5" rx="1.7" ry="1.3" fill="#2B2B2B" />
          <path d="M 30 37 Q 27 40 24 39 M 30 37 Q 33 40 36 39" stroke="#2B2B2B" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </FloatBtn>

      {/* 인스타그램 */}
      <FloatBtn href="https://www.instagram.com/wangwangland_?igsh=aWIycTZwcHZsMDhj" label="인스타그램" className={btnClass}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="#2B2B2B" strokeWidth="1.8" className="dark:stroke-[#FAFAFA]" />
          <circle cx="12" cy="12" r="3.5" stroke="#2B2B2B" strokeWidth="1.8" className="dark:stroke-[#FAFAFA]" />
          <circle cx="17.5" cy="6.5" r="1" fill="#2B2B2B" className="dark:fill-[#FAFAFA]" />
        </svg>
      </FloatBtn>

      {/* 네이버 카페 */}
      <FloatBtn href="https://cafe.naver.com/wangwangland" label="네이버 카페" className={btnClass}>
        <span className="text-[17px] font-extrabold leading-none tracking-tight text-[#03C75A]">N</span>
      </FloatBtn>

      {/* 맨 위로 — 200px 스크롤 시에만 노출 */}
      <div className={`transition-all duration-300 ${showTop ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <FloatBtn
          label="맨 위로"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={btnClass}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 15l6-6 6 6" stroke="#666" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-[#BBB]" />
          </svg>
        </FloatBtn>
      </div>
    </div>
  )
}
