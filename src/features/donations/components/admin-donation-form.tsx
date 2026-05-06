"use client"

import { Banknote, PackageOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { adminRegisterDonation } from "../api/mutations"
import { FormFooter } from "@/shared/components/form-footer"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  KOREAN_PHONE_PATTERN_RAW,
  ORG_OR_PERSON_HINT,
  ORG_OR_PERSON_PATTERN_RAW,
  PHONE_HINT,
} from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"

type DonationType = "cash" | "goods"

const QUICK_AMOUNTS = [10000, 30000, 50000, 100000]

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function AdminDonationForm() {
  const router = useRouter()
  const [type, setType] = useState<DonationType>("cash")
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleAmountChange(v: string) {
    const digits = v.replace(/[^0-9]/g, "")
    if (!digits) return setAmount("")
    setAmount(Number(digits).toLocaleString())
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("type", type)
    formData.set("amount", amount.replace(/,/g, ""))
    startTransition(async () => {
      const result = await adminRegisterDonation(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* 후원 종류 */}
      <Card title="후원 종류" required>
        <div className="grid grid-cols-2 gap-2">
          <TypeOption
            active={type === "cash"}
            Icon={Banknote}
            label="현금"
            desc="계좌이체 · 직접 전달"
            onClick={() => setType("cash")}
          />
          <TypeOption
            active={type === "goods"}
            Icon={PackageOpen}
            label="물품"
            desc="사료·간식·물품 등"
            onClick={() => setType("goods")}
          />
        </div>
      </Card>

      {/* 후원 내용 */}
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
                  onClick={() => setAmount(v.toLocaleString())}
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

      {/* 후원 일자 */}
      <Card title="후원 일자" required>
        <Field id="donated_at" label="날짜" required>
          <Input
            id="donated_at"
            name="donated_at"
            type="date"
            required
            defaultValue={today()}
            className="max-w-[200px]"
          />
        </Field>
      </Card>

      {/* 후원자 정보 */}
      <Card title="후원자 정보" required>
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="donor_name" label="이름 / 단체명" required>
            <Input
              id="donor_name"
              name="donor_name"
              required
              minLength={2}
              maxLength={30}
              pattern={ORG_OR_PERSON_PATTERN_RAW}
              title={ORG_OR_PERSON_HINT}
              placeholder="실명 또는 단체·회사명"
            />
            <p className="text-[11px] text-muted-foreground/80">{ORG_OR_PERSON_HINT}</p>
          </Field>
          <Field id="phone" label="연락처 (선택)">
            <Input
              id="phone"
              name="phone"
              type="tel"
              pattern={KOREAN_PHONE_PATTERN_RAW}
              title={PHONE_HINT}
              placeholder="010-0000-0000"
            />
            <p className="text-[11px] text-muted-foreground/80">직접 전달 시 없을 수 있음</p>
          </Field>
        </div>
      </Card>

      {/* 추가 정보 */}
      <Card title="추가 정보 (선택)">
        <div className="space-y-3">
          <Field id="display_name" label="공개 표시명">
            <Input
              id="display_name"
              name="display_name"
              placeholder="비우면 자동 마스킹 (예: 홍**)"
            />
          </Field>
          <Field id="message" label="메모">
            <Input
              id="message"
              name="message"
              maxLength={200}
              placeholder="예: 현장 직접 전달, 특이사항 등"
            />
          </Field>
          <label
            htmlFor="is_anonymous"
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox id="is_anonymous" name="is_anonymous" />
            익명으로 표시 (이름 노출 안 함)
          </label>
        </div>
      </Card>

      {/* 안내 */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        어드민 직접 등록 시 <span className="font-semibold text-primary">기록완료(승인)</span> 상태로 즉시 저장됩니다.
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <FormFooter
        pending={pending}
        submitLabel="후원 등록"
        pendingLabel="등록 중..."
        onCancel={() => router.back()}
      />
    </form>
  )
}

function Card({
  title,
  required,
  children,
}: {
  title: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
      </h3>
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
          className={cn("size-5", active ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </span>
      <span className="text-xs">{desc}</span>
    </button>
  )
}
