import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { VolunteerEditForm, getMyEditableVolunteerApplication } from "@/features/applications"
import { getCurrentProfile } from "@/features/members"

export const metadata: Metadata = { title: "봉사 일정 변경" }
export const dynamic = "force-dynamic"

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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/my/applications" className="hover:text-foreground">
          ← 내 신청 내역
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">봉사 일정 변경</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          취소된 신청은 변경할 수 없어요.
        </p>
      </header>
      <VolunteerEditForm application={application} />
    </div>
  )
}
