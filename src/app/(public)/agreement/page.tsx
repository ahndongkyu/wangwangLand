import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { getCurrentProfile, AgreementForm } from "@/features/members"
import { TERMS_VERSION } from "@/app/(public)/terms/page"
import { PRIVACY_VERSION } from "@/app/(public)/privacy/page"

export const metadata: Metadata = { title: "약관 재동의" }
export const dynamic = "force-dynamic"

export default async function AgreementPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  // 이미 최신 약관에 동의했다면 메인으로
  const termsOk =
    !!profile.terms_agreed_at && profile.terms_version === TERMS_VERSION
  const privacyOk =
    !!profile.privacy_agreed_at && profile.privacy_version === PRIVACY_VERSION
  if (termsOk && privacyOk) redirect("/")

  const isInitial = !profile.terms_agreed_at && !profile.privacy_agreed_at

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 text-center">
          <p className="text-3xl">📄</p>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            {isInitial ? "약관에 동의해 주세요" : "약관이 개정되었습니다"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isInitial ? (
              <>
                서비스 이용을 위해 약관과 개인정보 처리방침에
                <br />
                동의가 필요합니다.
              </>
            ) : (
              <>
                개정된 이용약관·개인정보 처리방침에 다시 동의해 주세요.
                <br />
                <span className="text-xs">시행일: {TERMS_VERSION}</span>
              </>
            )}
          </p>
        </div>

        <AgreementForm
          termsVersion={TERMS_VERSION}
          privacyVersion={PRIVACY_VERSION}
          marketingPrechecked={!!profile.marketing_agreed_at}
        />
      </div>
    </div>
  )
}
