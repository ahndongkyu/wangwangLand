"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Search, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

// react-daum-postcode 는 window 의존이라 SSR 비활성
const DaumPostcodeEmbed = dynamic(() => import("react-daum-postcode"), {
  ssr: false,
})

interface Props {
  /** form 의 input name (도로명 주소 부분) */
  name: string
  /** 상세주소 input name (기본 `${name}_detail`) — DB 에는 두 값을 합쳐 저장 */
  detailName?: string
  /** 도로명 주소 초기값 */
  defaultBaseAddress?: string
  /** 상세주소 초기값 */
  defaultDetailAddress?: string
  /** 우편번호 표시할지 (기본 false — 한 컬럼 저장 정책) */
  showZip?: boolean
  required?: boolean
  id?: string
}

/**
 * 카카오(다음) 우편번호 검색 + 도로명 주소 자동 채움.
 *
 *  [도로명 주소 ____] [🔍 검색]   ← 검색 버튼 클릭 시 모달
 *  [상세주소 _________________]
 *
 * form submit 시 hidden input(`name`)에 "도로명 + 상세" 합친 문자열이 들어가
 * DB 한 컬럼에 저장된다. 화면의 두 input 은 디스플레이 전용.
 */
export function AddressSearchInput({
  name,
  detailName,
  defaultBaseAddress = "",
  defaultDetailAddress = "",
  showZip = false,
  required,
  id = name,
}: Props) {
  const [base, setBase] = useState(defaultBaseAddress)
  const [detail, setDetail] = useState(defaultDetailAddress)
  const [zip, setZip] = useState("")
  const [open, setOpen] = useState(false)

  // ESC / body 스크롤 잠금
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  // 합쳐서 hidden input 에 넣을 값
  const combined = [base, detail].filter(Boolean).join(" ")

  return (
    <div className="space-y-2">
      {/* 도로명 주소 + 검색 버튼 */}
      <div className="flex gap-2">
        <Input
          id={id}
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="주소 검색을 눌러주세요"
          readOnly
          className="flex-1 cursor-default bg-secondary/40"
          required={required}
          aria-label="도로명 주소"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="shrink-0"
        >
          <Search className="mr-1.5 size-4" aria-hidden />
          검색
        </Button>
      </div>

      {/* 상세 주소 */}
      <Input
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="상세 주소 (동·호수·층 등)"
        disabled={!base}
        aria-label="상세 주소"
      />
      {showZip && zip && (
        <p className="text-xs text-muted-foreground">우편번호: {zip}</p>
      )}

      {/* 실제 form 으로 전송될 합쳐진 값 */}
      <input type="hidden" name={name} value={combined} />
      {detailName && <input type="hidden" name={detailName} value={detail} />}

      {/* 우편번호 검색 모달 */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="주소 검색"
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
        >
          <button
            type="button"
            aria-label="모달 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-base font-semibold text-foreground">
                주소 검색
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="flex-1 overflow-hidden">
              <DaumPostcodeEmbed
                style={{ width: "100%", height: "470px" }}
                onComplete={(data) => {
                  // 도로명 우선, 없으면 지번
                  const fullAddress = data.roadAddress || data.jibunAddress
                  setBase(fullAddress)
                  setZip(data.zonecode)
                  setOpen(false)
                }}
                animation
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
