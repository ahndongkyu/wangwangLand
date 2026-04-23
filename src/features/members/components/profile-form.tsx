"use client"

import { useActionState, useRef, useState } from "react"
import Image from "next/image"
import { Camera, User } from "lucide-react"
import { updateProfile } from "../api/actions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import type { Profile } from "../api/queries"

interface Props {
  profile: Profile
}

const initialState = { error: null as string | null, success: false }

export function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState(updateProfile, initialState)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const avatarSrc = preview ?? profile.avatar_url

  return (
    <form action={action} className="space-y-6">
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
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          사진 변경
        </button>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
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
          maxLength={20}
          placeholder="닉네임 입력"
        />
        <p className="text-xs text-muted-foreground">한글, 영문, 숫자, _ 사용 가능 (2~20자)</p>
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
  )
}
