"use client"

import { useTransition } from "react"
import { getKakaoLoginUrl } from "@/features/members/api/actions"

export function LoginForm() {
  const [pending, startTransition] = useTransition()

  function handleKakaoLogin() {
    startTransition(async () => {
      const url = await getKakaoLoginUrl()
      if (url) window.location.href = url
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        운영진 계정으로 로그인해주세요
      </p>
      <button
        type="button"
        onClick={handleKakaoLogin}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3 font-semibold text-[#191919] transition hover:bg-[#FEE500]/90 disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 2C5.582 2 2 4.925 2 8.5c0 2.26 1.396 4.245 3.516 5.42L4.59 17.1a.25.25 0 00.374.268L9.03 14.96c.319.028.643.04.97.04 4.418 0 8-2.925 8-6.5S14.418 2 10 2z"
            fill="#191919"
          />
        </svg>
        {pending ? "이동 중..." : "카카오로 로그인"}
      </button>
    </div>
  )
}
