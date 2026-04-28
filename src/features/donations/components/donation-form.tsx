"use client"

import { Banknote, ChevronDown, PackageOpen, Sprout } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { createDonation } from "../api/mutations"
import { ConsentSection } from "@/features/legal"
import { FormFooter } from "@/shared/components/form-footer"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

type DonationType = "cash" | "goods"

interface Props {
  /**
   * 로그인 회원이면 자동으로 채워질 정보.
   * email 은 폼에 노출되지 않고 백엔드에서 auth.users 의 값을 자동 저장.
   */
  defaultDonor?: { name?: string; email?: string; phone?: string }
  /** 회원가입 시 약관 동의 완료 시 자동 체크 */
  termsAlreadyAgreed?: boolean
}

const QUICK_AMOUNTS = [10000, 30000, 50000, 100000]

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function DonationForm({ defaultDonor, termsAlreadyAgreed = false }: Props) {
  const router = useRouter()
  const [type, setType] = useState<DonationType>("cash")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showOptional, setShowOptional] = useState(false)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(termsAlreadyAgreed)

  const isMember = !!defaultDonor

  function setQuickAmount(v: number) {
    setAmount(v.toLocaleString())
  }

  function handleAmountChange(v: string) {
    const digits = v.replace(/[^0-9]/g, "")
    if (!digits) return setAmount("")
    setAmount(Number(digits).toLocaleString())
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!privacyAgreed) return setError("개인정보 수집·이용 동의가 필요합니다.")
    if (!termsAgreed) return setError("이용약관 동의가 필요합니다.")
    const formData = new FormData(e.currentTarget)
    formData.set("type", type)
    formData.set("amount", amount.replace(/,/g, ""))
    startTransition(async () => {
      const result = await createDonation(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* 1. 후원 종류 */}
      <Card title="후원 종류" required>
        <div className="grid grid-cols-2 gap-2">
          <TypeOption
            active={type === "cash"}
            Icon={Banknote}
            label="현금 후원"
            desc="계좌이체"
            onClick={() => setType("cash")}
          />
          <TypeOption
            active={type === "goods"}
            Icon={PackageOpen}
            label="물품 후원"
            desc="사료·간식·물품 등"
            onClick={() => setType("goods")}
          />
        </div>
      </Card>

      {/* 2. 후원 내용 */}
      <Card title="후원 내용" required>
        {type === "cash" ? (
          <Field id="amount" label="후원 금액" required>
            <div className="relative">
              <Input
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
                placeholder="0"
                className="pr-12 text-right text-base font-semibold"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                원
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQuickAmount(v)}
                  className="rounded-md border border-border bg-background py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  +{(v / 10000).toLocaleString()}만
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1fr_140px]">
            <Field id="item_description" label="물품명" required>
              <Input
                id="item_description"
                name="item_description"
                required
                placeholder="예: 사료, 간식, 담요"
              />
            </Field>
            <Field id="item_quantity" label="수량/규격">
              <Input
                id="item_quantity"
                name="item_quantity"
                placeholder="예: 5kg, 3박스"
              />
            </Field>
          </div>
        )}
      </Card>

      {/* 3. 후원자 정보 — 이름 + 핸드폰만 (이메일은 회원이면 자동, 비회원은 미수집) */}
      <Card
        title="후원자 정보"
        required
        badge={isMember ? "회원 정보 자동 채움" : undefined}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="donor_name" label="이름" required>
            <Input
              id="donor_name"
              name="donor_name"
              required
              defaultValue={defaultDonor?.name ?? ""}
              placeholder="실명"
            />
          </Field>
          <Field id="phone" label="연락처" required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              defaultValue={defaultDonor?.phone ?? ""}
              placeholder="010-0000-0000"
            />
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          입금/물품 확인 시 운영진이 연락드립니다. 운영진만 확인합니다.
        </p>
      </Card>

      {/* 4. 추가 정보 (접힘) */}
      <details
        open={showOptional}
        onToggle={(e) => setShowOptional((e.target as HTMLDetailsElement).open)}
        className="rounded-lg border border-border bg-card"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground md:px-5">
          <span>추가 정보 (선택)</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              showOptional && "rotate-180"
            )}
            aria-hidden
          />
        </summary>
        <div className="space-y-3 border-t border-border px-4 py-4 md:px-5">
          <Field id="donated_at" label={type === "cash" ? "입금일" : "발송일"}>
            <Input
              id="donated_at"
              name="donated_at"
              type="date"
              defaultValue={today()}
              className="max-w-[200px]"
            />
            <p className="text-[11px] text-muted-foreground">
              기본값은 오늘. 다른 날짜에 진행했다면 수정해주세요.
            </p>
          </Field>
          <Field id="display_name" label="표시명">
            <Input
              id="display_name"
              name="display_name"
              placeholder="비우면 자동 마스킹 (예: 홍**)"
            />
          </Field>
          <Field id="message" label="한 줄 메시지">
            <Input
              id="message"
              name="message"
              maxLength={200}
              placeholder="예: 강아지들 화이팅!"
            />
          </Field>
          <label htmlFor="is_anonymous" className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox id="is_anonymous" name="is_anonymous" />
            익명으로 표시 (이름 노출 안 함)
          </label>
        </div>
      </details>

      {/* 5. 영수증 안내 (톤다운) */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Sprout className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
        <p>
          현재 본 단체는 기부금영수증 발급 자격을 받기 전 단계입니다. 등록해주신
          정보는 후원 기록 보관 및 추후 영수증 발급 안내 목적으로만 사용되며,
          제3자에게 제공되지 않습니다.
        </p>
      </div>

      {/* 6. 동의 */}
      <ConsentSection
        privacy={{
          purpose: "후원 기록 보관 및 추후 기부금영수증 발급 안내",
          items:
            type === "cash"
              ? "이름, 연락처, 후원 금액, 후원 일자"
              : "이름, 연락처, 물품 정보, 발송 일자",
          retention: "후원일로부터 5년 (회계 결산 공개·영수증 발급 대비)",
        }}
        privacyAgreed={privacyAgreed}
        onPrivacyChange={setPrivacyAgreed}
        termsAgreed={termsAgreed}
        onTermsChange={setTermsAgreed}
        termsAlreadyAgreed={termsAlreadyAgreed}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <FormFooter
        pending={pending}
        submitLabel="후원 등록하기"
        pendingLabel="등록 중..."
        onCancel={() => router.back()}
      />
    </form>
  )
}

function Card({
  title,
  required,
  badge,
  children,
}: {
  title: string
  required?: boolean
  badge?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
          {required && <span className="ml-1 text-destructive">*</span>}
        </h3>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

function TypeOption({
  active,
  Icon,
  label,
  desc,
  onClick,
}: {
  active: boolean
  Icon: typeof Banknote
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
        active
          ? "-translate-y-0.5 border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-5",
            active ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </span>
      <span className="text-xs">{desc}</span>
    </button>
  )
}
