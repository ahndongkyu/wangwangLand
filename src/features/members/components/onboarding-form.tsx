"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import { updateNickname } from "../api/actions"
import {
  AgreementModal,
  PrivacyContent,
  TermsContent,
} from "@/features/legal"

const initialState = { error: null as string | null }

interface Props {
  defaultNickname?: string
  termsVersion: string
  privacyVersion: string
}

export function OnboardingForm({
  defaultNickname,
  termsVersion,
  privacyVersion,
}: Props) {
  const [state, action, pending] = useActionState(updateNickname, initialState)
  const inputRef = useRef<HTMLInputElement>(null)

  const [age, setAge] = useState(false)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [agreeAll, setAgreeAll] = useState(false)
  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleAgreeAll(checked: boolean) {
    setAgreeAll(checked)
    setAge(checked)
    setTerms(checked)
    setPrivacy(checked)
    setMarketing(checked)
  }

  // 개별 변경 시 전체 동의 자동 갱신
  useEffect(() => {
    setAgreeAll(age && terms && privacy && marketing)
  }, [age, terms, privacy, marketing])

  const requiredOk = age && terms && privacy

  return (
    <form action={action} className="space-y-5">
      {/* 닉네임 */}
      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
          닉네임 <span className="text-destructive">*</span>
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          사이트에서 다른 사람에게 보여질 이름. 본명 대신 자유롭게 정해주세요.
        </p>
        <input
          ref={inputRef}
          id="nickname"
          name="nickname"
          type="text"
          defaultValue={defaultNickname}
          maxLength={20}
          required
          className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="예: 강아지러버, 행복한사람"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          한글·영문·숫자·_ · 2~20자
        </p>
      </div>

      {/* 핸드폰번호 */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          핸드폰번호 <span className="text-destructive">*</span>
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          신청·후원 처리 시 운영진이 연락드립니다. 운영진만 확인합니다.
        </p>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="010-0000-0000"
        />
      </div>

      {/* 약관 동의 */}
      <fieldset className="space-y-2 rounded-xl border border-border bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">약관 동의</legend>

        {/* 전체 동의 */}
        <label className="flex cursor-pointer items-center gap-2 border-b border-border/60 pb-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={agreeAll}
            onChange={(e) => handleAgreeAll(e.target.checked)}
            className="size-4 accent-primary"
          />
          전체 동의 <span className="text-xs font-normal text-muted-foreground">(선택 항목 포함)</span>
        </label>

        <AgreeRow
          name="age_agree"
          required
          checked={age}
          onChange={setAge}
          label="만 14세 이상입니다"
        />
        <AgreeRow
          name="terms_agree"
          required
          checked={terms}
          onChange={setTerms}
          label="이용약관 동의"
          onView={() => setOpenModal("terms")}
        />
        <AgreeRow
          name="privacy_agree"
          required
          checked={privacy}
          onChange={setPrivacy}
          label="개인정보 처리방침 동의"
          onView={() => setOpenModal("privacy")}
        />
        <AgreeRow
          name="marketing_agree"
          checked={marketing}
          onChange={setMarketing}
          label="마케팅 정보 수신 동의"
        />

        {/* 버전 정보 hidden */}
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
        {pending ? "저장 중..." : "가입 완료"}
      </button>
      {!requiredOk && (
        <p className="text-center text-xs text-muted-foreground">
          필수 동의 항목에 모두 체크해야 가입할 수 있습니다.
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

function AgreeRow({
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
