import Link from "next/link"
import type { Metadata } from "next"

import { LoginForm } from "@/features/auth/components/login-form"
import { SITE } from "@/shared/constants/site"

export const metadata: Metadata = {
  title: "운영진 로그인",
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-foreground">
            {SITE.name}
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">운영진 로그인</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
