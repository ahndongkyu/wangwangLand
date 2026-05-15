"use client"

import { useState } from "react"

import { AgreementModal } from "./agreement-modal"
import { PrivacyContent } from "./privacy-content"
import { TermsContent } from "./terms-content"

interface PrivacyDetail {
  /** 수집 목적 (예: "입양 상담 및 사후 모니터링") */
  purpose: string
  /** 수집 항목 (예: "이름, 연락처, 주소...") */
  items: string
  /** 보유·이용 기간 (예: "입양 완료 후 1년간") */
  retention: string
}

interface Props {
  /** 신청별 개인정보 수집·이용 항목 안내 */
  privacy: PrivacyDetail
  /** 개인정보 동의 여부 (controlled) */
  privacyAgreed: boolean
  onPrivacyChange: (v: boolean) => void
  /** 약관 동의 여부 (controlled) */
  termsAgreed: boolean
  onTermsChange: (v: boolean) => void
  /**
   * 회원가입 시 이미 약관에 동의한 경우 true.
   * 약관 체크박스 자동 체크 + disabled 상태로 노출.
   */
  termsAlreadyAgreed?: boolean
}

/**
 * 신청 폼(입양/봉사/후원)에 공통으로 들어가는 개인정보·약관 동의 섹션.
 *  - 개인정보: 신청별 발췌 + 전문 보기 모달
 *  - 약관: 회원가입 시 동의했으면 자동 체크, 아니면 체크 받음 + 모달 보기
 */
export function ConsentSection({
  privacy,
  privacyAgreed,
  onPrivacyChange,
  termsAgreed,
  onTermsChange,
  termsAlreadyAgreed = false,
}: Props) {
  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null)

  return (
    <fieldset className="space-y-3 rounded-lg border border-border bg-card p-4">
      <legend className="px-1 text-sm font-semibold text-muted-foreground">
        동의 (필수)
      </legend>

      {/* 개인정보 수집·이용 동의 */}
      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 bg-secondary/30 p-3 text-sm">
        <input
          type="checkbox"
          checked={privacyAgreed}
          onChange={(e) => onPrivacyChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        {/* 서버 액션이 form data 에서 확실히 읽을 수 있도록 hidden 으로 분리 */}
        {privacyAgreed && (
          <input type="hidden" name="privacy_agreed" value="on" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
              필수
            </span>
            <span className="font-medium text-foreground">
              개인정보 수집·이용 동의
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpenModal("privacy")
              }}
              className="ml-auto text-xs text-muted-foreground underline hover:text-primary"
            >
              전문 보기
            </button>
          </span>
          <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-muted-foreground">
            <li>
              <span className="text-foreground/80">목적</span> · {privacy.purpose}
            </li>
            <li>
              <span className="text-foreground/80">항목</span> · {privacy.items}
            </li>
            <li>
              <span className="text-foreground/80">보유</span> · {privacy.retention}
            </li>
          </ul>
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            동의 거부 가능. 단, 거부 시 신청이 어렵습니다.
          </p>
        </span>
      </label>

      {/* 이용약관 동의 — 개인정보 row 와 동일 패딩으로 좌측 정렬 통일 */}
      <label className={`flex items-center gap-2 rounded-md border border-border/60 bg-secondary/30 p-3 text-sm ${termsAlreadyAgreed ? "cursor-default" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={termsAgreed}
          onChange={(e) => { if (!termsAlreadyAgreed) onTermsChange(e.target.checked) }}
          className="size-4 shrink-0 accent-primary"
        />
        {/* hidden 으로 form data 보장 (controlled + disabled 케이스 모두 처리) */}
        {termsAgreed && (
          <input type="hidden" name="terms_agreed" value="on" />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive">
            필수
          </span>
          <span className="font-medium text-foreground">이용약관 동의</span>
          {termsAlreadyAgreed && (
            <span className="text-[10px] text-muted-foreground">
              (회원가입 시 동의 완료)
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpenModal("terms")
          }}
          className="ml-auto shrink-0 text-xs text-muted-foreground underline hover:text-primary"
        >
          보기
        </button>
      </label>

      {/* 모달 */}
      <AgreementModal
        open={openModal === "privacy"}
        onClose={() => setOpenModal(null)}
        title="개인정보 처리방침"
      >
        <PrivacyContent embedded />
      </AgreementModal>
      <AgreementModal
        open={openModal === "terms"}
        onClose={() => setOpenModal(null)}
        title="이용약관"
      >
        <TermsContent embedded />
      </AgreementModal>
    </fieldset>
  )
}
