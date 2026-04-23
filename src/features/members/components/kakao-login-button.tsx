"use client"

import { useTransition } from "react"
import { getKakaoLoginUrl } from "../api/actions"

export function KakaoLoginButton() {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const url = await getKakaoLoginUrl()
      if (url) window.location.href = url
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-6 py-3.5 text-base font-bold text-[#191919] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <KakaoIcon />
      {pending ? "연결 중..." : "카카오로 시작하기"}
    </button>
  )
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2C5.58 2 2 4.91 2 8.5c0 2.28 1.43 4.28 3.6 5.47L4.8 17.1c-.07.26.2.47.43.33L8.8 15.1c.39.05.79.08 1.2.08 4.42 0 8-2.91 8-6.5S14.42 2 10 2z"
        fill="#191919"
      />
    </svg>
  )
}
