"use client"

import Link from "next/link"
import { useRef, useState, useTransition } from "react"

import {
  createDonationThanks,
  updateDonationThanks,
} from "../api/mutations"
import type { DonationThanks } from "../types"
import { RichTextEditor } from "@/shared/components/rich-text-editor"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

interface Props {
  /** 전체(수정 모드) 또는 일부 prefill (신규 모드 — 예: donation_id 만). */
  post?: Partial<DonationThanks>
  cancelHref?: string
}

export function ThanksForm({ post, cancelHref = "/admin/thanks" }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // 수정 모드 판정 — 기존 행이면 id 가 있음.
  const isEdit = Boolean(post?.id)
  const contentRef = useRef<string>(post?.content ?? "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("content", contentRef.current)
    startTransition(async () => {
      const result =
        isEdit && post?.id
          ? await updateDonationThanks(post.id, formData)
          : await createDonationThanks(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={post?.title ?? ""}
          placeholder="예: 사료 후원 감사드립니다 🙏"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="donor_display_name">후원자 표시명</Label>
          <Input
            id="donor_display_name"
            name="donor_display_name"
            defaultValue={post?.donor_display_name ?? ""}
            placeholder="예: 김** / 익명"
          />
          <p className="text-[11px] text-muted-foreground">
            마스킹된 이름 또는 익명. 공개 페이지에 노출됩니다.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="donation_summary">받은 후원</Label>
          <Input
            id="donation_summary"
            name="donation_summary"
            defaultValue={post?.donation_summary ?? ""}
            placeholder="예: 사료 5kg, 간식 3박스"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="donation_id">연결된 후원 ID (선택)</Label>
        <Input
          id="donation_id"
          name="donation_id"
          defaultValue={post?.donation_id ?? ""}
          placeholder="후원 회계 기록과 연결할 때만"
        />
        <p className="text-[11px] text-muted-foreground">
          비워둬도 됩니다. 어드민 후원 관리에서 [감사글 작성] 으로 들어오면 자동 채워짐.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>본문</Label>
        <RichTextEditor
          name="content"
          defaultValue={post?.content ?? ""}
          placeholder="후원자께 전하는 감사 메시지와 받은 물품 사진을 자유롭게 적어주세요."
          folder="thanks"
          onChange={(html) => {
            contentRef.current = html
          }}
        />
        <p className="text-xs text-muted-foreground">
          💡 본문에 삽입된 첫 번째 이미지가 목록 썸네일로 자동 사용됩니다.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publish"
          defaultChecked={!!post?.published_at}
          className="size-4 accent-primary"
        />
        <span className="font-medium text-foreground">바로 공개</span>
        <span className="text-xs text-muted-foreground">
          (체크 해제 시 임시저장)
        </span>
      </label>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href={cancelHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : isEdit ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  )
}
