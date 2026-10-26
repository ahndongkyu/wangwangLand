"use client"
import { useOperatingContact } from "@/features/settings/components/operating-provider"


export function VolunteerContactGuide() {
  const contact = useOperatingContact()
  if (!contact) return <p>문의 연락처를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
  return (
    <section className="rounded-xl border border-border bg-card p-4 text-left text-sm leading-relaxed sm:p-5">
      <h3 className="mb-3 font-semibold">변경·문의 안내</h3>
      <p className="font-medium">일정 변경 및 취소</p>
      <p className="mt-1 text-muted-foreground">홈페이지 마이페이지 → 신청 내역에서 요청해 주세요.</p>
      <p className="mt-4 font-medium">봉사 활동·방문 일정 문의</p>
      <p className="mt-1 text-muted-foreground">카카오톡 채널 또는 봉사담당팀장에게 문의해 주세요.</p>
      <a href={contact.kakaoChannel} target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        카카오톡 채널 문의
      </a>
      <p className="mt-3 text-muted-foreground">봉사담당팀장</p>
      <a href={`tel:${contact.volunteerPhone.replace(/\D/g, "")}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{contact.volunteerPhone}</a>
    </section>
  )
}
