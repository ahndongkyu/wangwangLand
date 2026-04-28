"use client"

import { useActionState, useEffect, useState } from "react"

import { acceptAgreements } from "../api/actions"
import {
  AgreementModal,
  PrivacyContent,
  TermsContent,
} from "@/features/legal"

const initialState = { error: null as string | null }

interface Props {
  termsVersion: string
  privacyVersion: string
  /** 기존 마케팅 동의 여부 (재동의 화면에서 기본값으로 미리 체크) */
  marketingPrechecked?: boolean
}

export function AgreementForm({
  termsVersion,
  privacyVersion,
  marketingPrechecked = false,
}: Props) {
  const [state, action, pending] = useActionState(acceptAgreements, initialState)

  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(marketingPrechecked)
  const [agreeAll, setAgreeAll] = useState(false)
  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null)

  function handleAgreeAll(checked: boolean) {
    setAgreeAll(checked)
    setTerms(checked)
    setPrivacy(checked)
    setMarketing(checked)
  }

  useEffect(() => {
    setAgreeAll(terms && privacy && marketing)
  }, [terms, privacy, marketing])

  const requiredOk = terms && privacy

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2 rounded-xl border border-border bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">약관 동의</legend>

        <label className="flex cursor-pointer items-center gap-2 border-b border-border/60 pb-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={agreeAll}
            onChange={(e) => handleAgreeAll(e.target.checked)}
            className="size-4 accent-primary"
          />
          전체 동의 <span className="text-xs font-normal text-muted-foreground">(선택 항목 포함)</span>
        </label>

        <Row
          name="terms_agree"
          required
          checked={terms}
          onChange={setTerms}
          label="이용약관 동의"
          onView={() => setOpenModal("terms")}
        />
        <Row
          name="privacy_agree"
          required
          checked={privacy}
          onChange={setPrivacy}
          label="개인정보 처리방침 동의"
          onView={() => setOpenModal("privacy")}
        />
        <Row
          name="marketing_agree"
          checked={marketing}
          onChange={setMarketing}
          label="마케팅 정보 수신 동의"
        />

        <input type="hidden" name="terms_version" value={termsVersion} />
        <input type="hidden" name="privacy_version" value={privacyVersion} />
      </fieldset>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !requiredOk}
        className="w-full rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "저장 중..." : "동의하고 계속"}
      </button>
      {!requiredOk && (
        <p className="text-center text-xs text-muted-foreground">
          필수 동의 항목에 모두 체크해야 진행할 수 있습니다.
        </p>
      )}

      <AgreementModal
        open={openModal === "terms"}
        onClose={() => setOpenModal(null)}
        title="이용약관"
      >
        <TermsContent embedded />
      </AgreementModal>
      <AgreementModal
        open={openModal === "privacy"}
        onClose={() => setOpenModal(null)}
        title="개인정보 처리방침"
      >
        <PrivacyContent embedded />
      </AgreementModal>
    </form>
  )
}

function Row({
  name,
  required,
  checked,
  onChange,
  label,
  onView,
}: {
  name: string
  required?: boolean
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  /** "보기" 클릭 시 호출 — 모달 오픈용 */
  onView?: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      <span
        className={`shrink-0 rounded-full px-1.5 text-[10px] font-bold ${
          required
            ? "bg-destructive/15 text-destructive"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {required ? "필수" : "선택"}
      </span>
      <span className="flex-1">{label}</span>
      {onView && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onView()
          }}
          className="text-xs text-muted-foreground underline hover:text-primary"
        >
          보기
        </button>
      )}
    </label>
  )
}
