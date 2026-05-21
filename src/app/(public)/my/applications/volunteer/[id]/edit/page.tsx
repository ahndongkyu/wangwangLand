import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { VolunteerEditForm, getMyEditableVolunteerApplication } from "@/features/applications"
import { getCurrentProfile } from "@/features/members"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: "봉사 일정 변경" }
}

export default async function VolunteerApplicationEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const { id } = await params
  const application = await getMyEditableVolunteerApplication(id, profile.id)
  if (!application) notFound()

  const isReschedule = application.status === "승인" || application.status === "일정변경요청"
  const title = isReschedule ? "봉사 일정변경 요청" : "봉사 일정 변경"
  const description = isReschedule
    ? "희망 날짜를 선택하면 운영진이 확인 후 일정을 확정해드려요."
    : "취소·반려된 신청은 변경할 수 없어요."

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/my/applications" className="hover:text-foreground">
          ← 내 신청 내역
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </header>
      <VolunteerEditForm application={application} isReschedule={isReschedule} />
    </div>
  )
}
