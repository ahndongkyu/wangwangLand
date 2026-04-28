import Link from "next/link"
import type { Metadata } from "next"

import { DonationForm } from "@/features/donations"
import { getCurrentProfile } from "@/features/members"
import { TERMS_VERSION } from "@/features/legal"
import { createClient } from "@/shared/lib/supabase/server"

export const metadata: Metadata = {
  title: "후원 등록",
}

export const dynamic = "force-dynamic"

export default async function DonateRegisterPage() {
  const supabase = await createClient()
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getCurrentProfile(),
  ])
  const termsAlreadyAgreed =
    !!profile?.terms_agreed_at && profile.terms_version === TERMS_VERSION

  const defaultDonor = profile
    ? {
        name: profile.nickname,
        email: user?.email ?? "",
        phone: profile.phone ?? "",
      }
    : undefined

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/donate" className="hover:text-foreground">
          ← 후원 안내
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          후원 등록
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          입금 또는 물품 발송 후 아래 폼을 작성해주세요.
          {profile
            ? " 회원 정보가 자동으로 채워집니다."
            : " 비회원도 등록 가능하지만, 마이페이지 조회를 원하시면 로그인 후 등록해주세요."}
        </p>
      </header>

      <DonationForm
        defaultDonor={defaultDonor}
        termsAlreadyAgreed={termsAlreadyAgreed}
      />
    </div>
  )
}
