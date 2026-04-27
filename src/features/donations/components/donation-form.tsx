"use client"

import { useState, useTransition } from "react"

import { createDonation } from "../api/mutations"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

type DonationType = "cash" | "goods"

interface Props {
  /** 로그인 사용자 정보가 있으면 일부 필드를 미리 채움 */
  defaultDonor?: { name?: string; email?: string }
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function DonationForm({ defaultDonor }: Props) {
  const [type, setType] = useState<DonationType>("cash")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("type", type)
    startTransition(async () => {
      const result = await createDonation(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 후원 종류 */}
      <div className="space-y-2">
        <Label>후원 종류 *</Label>
        <div className="grid grid-cols-2 gap-2">
          <TypeOption
            active={type === "cash"}
            label="💰 현금 후원"
            desc="계좌이체"
            onClick={() => setType("cash")}
          />
          <TypeOption
            active={type === "goods"}
            label="📦 물품 후원"
            desc="사료/간식/물품 등"
            onClick={() => setType("goods")}
          />
        </div>
      </div>

      {/* 후원자 정보 */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
        <legend className="px-1 text-sm font-semibold text-muted-foreground">
          후원자 정보 (운영진만 확인)
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="donor_name">이름 *</Label>
            <Input
              id="donor_name"
              name="donor_name"
              required
              defaultValue={defaultDonor?.name ?? ""}
              placeholder="실명"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">이메일 *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={defaultDonor?.email ?? ""}
              placeholder="추후 영수증 발급 안내"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="010-0000-0000 (선택)"
            />
          </div>
        </div>
      </fieldset>

      {/* 후원 내용 */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-muted-foreground">
          후원 내용
        </legend>
        {type === "cash" ? (
          <div className="space-y-1.5">
            <Label htmlFor="amount">후원 금액 *</Label>
            <div className="relative">
              <Input
                id="amount"
                name="amount"
                inputMode="numeric"
                pattern="[0-9,]*"
                required
                placeholder="예: 50000"
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label htmlFor="item_description">물품명 *</Label>
              <Input
                id="item_description"
                name="item_description"
                required
                placeholder="예: 사료, 간식, 담요"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item_quantity">수량/규격</Label>
              <Input
                id="item_quantity"
                name="item_quantity"
                placeholder="예: 5kg, 3박스"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="donated_at">후원 일자 *</Label>
          <Input
            id="donated_at"
            name="donated_at"
            type="date"
            required
            defaultValue={today()}
            className="max-w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            {type === "cash" ? "입금일" : "발송일"}
          </p>
        </div>
      </fieldset>

      {/* 공개 옵션 */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-4">
        <legend className="px-1 text-sm font-semibold text-muted-foreground">
          공개 표시 (마이페이지에서 본인 확인용. 페이지 공개는 추후 예정)
        </legend>
        <div className="space-y-1.5">
          <Label htmlFor="display_name">표시명</Label>
          <Input
            id="display_name"
            name="display_name"
            placeholder="비우면 자동 마스킹 (예: 홍**)"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="message">한 줄 메시지</Label>
          <Input
            id="message"
            name="message"
            maxLength={200}
            placeholder="예: 강아지들 화이팅!"
          />
        </div>
        <label htmlFor="is_anonymous" className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox id="is_anonymous" name="is_anonymous" />
          익명으로 표시 (이름 노출 안 함)
        </label>
      </fieldset>

      {/* 안내 */}
      <div className="rounded-lg bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
        🌱 현재 본 단체는 기부금영수증 발급 자격을 받기 전 단계입니다.
        등록해주신 정보는 후원 기록 보관 및 추후 영수증 발급 안내 목적으로만 사용되며,
        제3자에게 제공되지 않습니다.
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "등록 중..." : "후원 등록하기"}
        </Button>
      </div>
    </form>
  )
}

function TypeOption({
  active,
  label,
  desc,
  onClick,
}: {
  active: boolean
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs">{desc}</span>
    </button>
  )
}
