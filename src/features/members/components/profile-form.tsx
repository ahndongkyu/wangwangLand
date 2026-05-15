"use client"

import { useActionState, useRef, useState } from "react"
import Image from "next/image"
import { Camera, User } from "lucide-react"
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

      {/* 닉네임 */}
      <div className="space-y-1.5">
        <label htmlFor="nickname" className="text-sm font-medium text-foreground">
          닉네임
        </label>
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
      </div>

      {/* 핸드폰번호 */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          핸드폰번호
        </label>
        <PhoneInput
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
          readOnly
          className="cursor-default bg-secondary/50"
        />
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

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "저장 중..." : "저장"}
      </Button>
    </form>
    </>
  )
}
