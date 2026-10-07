"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { User } from "lucide-react"
import { updateProfile } from "../api/actions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ImageCropModal } from "@/shared/components/image-crop-modal"
import { useToast } from "@/shared/components/toast"
import { MOBILE_PHONE_HINT, MOBILE_PHONE_PATTERN_RAW, NICKNAME_HINT, NICKNAME_PATTERN_RAW, formatKoreanPhone } from "@/shared/lib/validation"
import { PhoneInput } from "@/shared/components/phone-input"
import type { Profile } from "../api/queries"

interface Props {
  profile: Profile
  startEditing?: boolean
}

export function ProfileForm({ profile, startEditing = false }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const running = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const croppedFileRef = useRef<File | null>(null)
  const [saved, setSaved] = useState({ nickname: profile.nickname, phone: profile.phone, avatar: profile.avatar_url })
  const [preview, setPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(startEditing || !profile.phone)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || running.current) return
    if (!file.type.startsWith("image/")) { setError("이미지 파일을 선택해주세요."); return }
    if (file.size > 5 * 1024 * 1024) { setError("이미지는 5MB 이하만 가능합니다."); return }
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.onerror = () => setError("이미지를 읽지 못했습니다. 다시 선택해주세요.")
    reader.readAsDataURL(file)
  }

  function handleCropDone(file: File, previewUrl: string) {
    croppedFileRef.current = file
    setPreview(previewUrl)
    setCropSrc(null)
    setError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    if (running.current || !saved.phone) return
    croppedFileRef.current = null
    setPreview(null)
    setCropSrc(null)
    setError(null)
    setIsEditing(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    const data = new FormData(event.currentTarget)
    if (croppedFileRef.current) data.set("avatar", croppedFileRef.current)
    running.current = true
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateProfile({ error: null }, data)
        if (!result.success || result.error) {
          const message = result.error || "저장 완료 여부를 확인하지 못했습니다. 다시 확인해주세요."
          setError(message)
          toast.error(message)
          return
        }
        setSaved({
          nickname: String(data.get("nickname") ?? "").trim(),
          phone: formatKoreanPhone(String(data.get("phone") ?? "")),
          avatar: result.avatarUrl ?? saved.avatar,
        })
        croppedFileRef.current = null
        setPreview(null)
        setIsEditing(false)
        toast.success("프로필을 저장했습니다.")
        if (startEditing) router.replace("/my?tab=settings")
        router.refresh()
      } catch {
        const message = "저장 결과를 확인하지 못했습니다. 다시 확인해주세요."
        setError(message)
        toast.error(message)
      } finally {
        running.current = false
      }
    })
  }

  const avatarSrc = preview ?? saved.avatar
  return (
    <section aria-labelledby="profile-settings-title" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      {cropSrc && <ImageCropModal imageSrc={cropSrc} aspect={1} circular onDone={handleCropDone} onCancel={() => setCropSrc(null)} />}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h2 id="profile-settings-title" className="text-lg font-semibold">프로필 정보</h2><p className="mt-1 text-sm text-muted-foreground">사진과 연락처를 관리하세요.</p></div>
        {!isEditing && <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setIsEditing(true) }}>수정</Button>}
      </div>
      {!saved.phone && <p role="status" className="mb-5 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed">신청 안내를 받을 전화번호를 등록해주세요. 등록 후 다른 서비스를 이용할 수 있습니다.</p>}
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:border-r sm:border-border sm:pr-5">
          <button type="button" aria-label="프로필 사진 변경" disabled={pending} onClick={() => fileRef.current?.click()} className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-secondary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 sm:size-20">
            {avatarSrc ? <Image src={avatarSrc} alt="" fill sizes="80px" className="object-cover" /> : <User aria-hidden="true" className="size-full p-4 text-muted-foreground" />}
          </button>
          <div className="sm:text-center"><button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className="min-h-11 text-sm font-medium text-primary hover:underline disabled:opacity-50">사진 변경</button><p className="text-xs text-muted-foreground">이미지 최대 5MB</p></div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <fieldset disabled={pending} className="min-w-0 space-y-5">
          <div className="space-y-2"><label htmlFor={isEditing ? "nickname" : undefined} className="text-sm font-medium">닉네임</label>
            {isEditing ? <><Input id="nickname" name="nickname" defaultValue={saved.nickname} required minLength={2} maxLength={20} pattern={NICKNAME_PATTERN_RAW} title={NICKNAME_HINT} aria-describedby="nickname-hint" className="min-h-11" /><p id="nickname-hint" className="text-xs text-muted-foreground">{NICKNAME_HINT}</p></> : <p className="text-sm [overflow-wrap:anywhere]">{saved.nickname}</p>}
          </div>
          <div className="space-y-2"><label htmlFor={isEditing ? "phone" : undefined} className="text-sm font-medium">전화번호</label>
            {isEditing ? <><PhoneInput id="phone" name="phone" defaultValue={saved.phone ?? ""} pattern={MOBILE_PHONE_PATTERN_RAW} title={MOBILE_PHONE_HINT} maxLength={13} required aria-describedby="phone-hint" className="min-h-11" /><p id="phone-hint" className="text-xs text-muted-foreground">봉사·입양 신청 안내에 사용합니다.</p></> : <p className="text-sm tabular-nums">{saved.phone ?? "미등록"}</p>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {isEditing && <div className="flex gap-2 border-t border-border pt-4">{saved.phone && <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={cancelEditing}>취소</Button>}<Button type="submit" className="min-h-11 flex-1">{pending ? "저장 중…" : "변경사항 저장"}</Button></div>}
        </fieldset>
      </form>
    </section>
  )
}
