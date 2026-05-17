"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera, Pencil, User, X } from "lucide-react"
import { updateProfile } from "../api/actions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ImageCropModal } from "@/shared/components/image-crop-modal"
import {
  NICKNAME_HINT,
  NICKNAME_PATTERN_RAW,
} from "@/shared/lib/validation"
import { PhoneInput } from "@/shared/components/phone-input"
import type { Profile } from "../api/queries"

interface Props {
  profile: Profile
}

const initialState = { error: null as string | null, success: false, avatarUrl: null as string | null }

export function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState(updateProfile, initialState)
  const fileRef = useRef<HTMLInputElement>(null)
  const croppedFileRef = useRef<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // 핸드폰이 없는 회원은 바로 수정 모드로 시작
  const [isEditing, setIsEditing] = useState(!profile.phone)

  // 저장 성공 시 수정 모드 자동 종료
  useEffect(() => {
    if (state.success) setIsEditing(false)
  }, [state.success])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  function handleCropDone(file: File, previewUrl: string) {
    croppedFileRef.current = file
    setPreview(previewUrl)
    setCropSrc(null)
  }

  // 폼 제출 시 크롭된 파일을 FormData에 주입
  function handleSubmit(formData: FormData) {
    if (croppedFileRef.current) {
      formData.set("avatar", croppedFileRef.current)
    }
    return action(formData)
  }

  // 저장 성공 시 서버에서 받은 새 URL로 즉시 교체
  const avatarSrc = (state.success && state.avatarUrl) ? state.avatarUrl : (preview ?? profile.avatar_url)

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={1}
          circular
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <form action={handleSubmit} className="space-y-6">
        {/* 프로필 사진 */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative size-24 overflow-hidden rounded-full border-2 border-primary/30 bg-muted transition-opacity hover:opacity-80"
          >
            {avatarSrc ? (
              <Image src={avatarSrc} alt="프로필 사진" fill className="object-cover" />
            ) : (
              <User className="size-full p-5 text-muted-foreground" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            사진 변경
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* 닉네임 + 핸드폰 — 수정 모드 토글 */}
        <div className="space-y-4">
          {/* 수정 버튼 (수정 모드가 아닐 때만) */}
          {!isEditing && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Pencil className="size-3.5" />
                수정
              </button>
            </div>
          )}

          {/* 닉네임 */}
          <div className="space-y-1.5">
            <label htmlFor="nickname" className="text-sm font-medium text-foreground">
              닉네임
            </label>
            {isEditing ? (
              <>
                <Input
                  id="nickname"
                  name="nickname"
                  defaultValue={profile.nickname}
                  minLength={2}
                  maxLength={20}
                  pattern={NICKNAME_PATTERN_RAW}
                  title={NICKNAME_HINT}
                  placeholder="닉네임 입력"
                />
                <p className="text-xs text-muted-foreground">{NICKNAME_HINT}</p>
              </>
            ) : (
              <>
                <input type="hidden" name="nickname" value={profile.nickname} />
                <p className="flex h-8 items-center rounded-lg bg-secondary/50 px-3 text-sm text-foreground">
                  {profile.nickname}
                </p>
              </>
            )}
          </div>

          {/* 핸드폰번호 */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              핸드폰번호
            </label>
            {isEditing ? (
              <PhoneInput
                id="phone"
                name="phone"
                defaultValue={profile.phone ?? ""}
                placeholder="010-0000-0000"
              />
            ) : (
              <>
                <input type="hidden" name="phone" value={profile.phone ?? ""} />
                <p className="flex h-8 items-center rounded-lg bg-secondary/50 px-3 text-sm text-foreground">
                  {profile.phone ?? "—"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 에러 / 성공 */}
        {state.error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
            프로필이 저장됐습니다!
          </p>
        )}

        {isEditing ? (
          <div className="flex gap-2">
            {/* 핸드폰이 이미 있는 경우만 취소 가능 */}
            {profile.phone && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <X className="size-4" />
                취소
              </button>
            )}
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "저장 중..." : "저장"}
            </Button>
          </div>
        ) : null}
      </form>
    </>
  )
}
