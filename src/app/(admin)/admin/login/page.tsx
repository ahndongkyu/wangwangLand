import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"

import { LoginForm } from "@/features/auth/components/login-form"
import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "운영진 로그인",
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div
      data-admin-scope
      className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#1f3028_0%,#2d4538_52%,#17241e_100%)] px-4"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3 text-2xl font-bold text-white">
            <Image
              src={SITE.logo}
              alt={`${SITE.name} 로고`}
              width={48}
              height={48}
              className="size-12 rounded-full border-2 border-white/20"
              priority
            />
            <span>{SITE.name}</span>
          </Link>
          <p className="mt-3 text-sm font-medium text-white/65">운영진 전용 관리 화면</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-card p-6 shadow-[0_24px_60px_rgba(8,20,14,0.32)]">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
