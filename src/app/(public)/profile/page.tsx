import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentProfile } from "@/features/members"
import { ProfileForm } from "@/features/members/components/profile-form"

export const metadata: Metadata = { title: "프로필 설정" }

const ROLE_LABEL: Record<string, string> = {
  member: "일반회원",
  full_member: "정회원",
  staff: "운영진",
  admin: "관리자",
}

const ROLE_COLOR: Record<string, string> = {
  member: "bg-secondary text-muted-foreground",
  full_member: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  staff: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status === "pending") redirect("/pending")
  if (profile.status === "rejected") redirect("/rejected")

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">프로필 설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">닉네임과 프로필 사진을 변경할 수 있어요</p>
          <div className="mt-2 flex justify-center">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR[profile.role]}`}>
              {ROLE_LABEL[profile.role]}
            </span>
          </div>
        </div>

        <ProfileForm profile={profile} />
      </div>
    </div>
  )
}
