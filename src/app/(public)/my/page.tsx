import { redirect } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, ClipboardList, Heart, LogOut, Settings, User } from "lucide-react"

import { getCurrentProfile } from "@/features/members"
import { signOut } from "@/features/members/api/actions"
import { RoleBadge } from "@/shared/components/role-badge"

export const metadata: Metadata = { title: "마이페이지" }
export const dynamic = "force-dynamic"

export default async function MyPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.status === "pending") redirect("/pending")
  if (profile.status === "rejected") redirect("/rejected")

  const isStaff = profile.role === "staff" || profile.role === "admin"

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 md:py-14">

      {/* 프로필 히어로 카드 */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.nickname}
                fill
                className="object-cover"
              />
            ) : (
              <User className="size-full p-3.5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <RoleBadge role={profile.role} />
            <p className="mt-1 truncate text-lg font-bold text-foreground">
              {profile.nickname}
            </p>
            <p className="text-xs text-muted-foreground">왕왕랜드 회원</p>
          </div>
        </div>
      </div>

      {/* 메뉴 카드들 */}
      <div className="space-y-3">

        {/* 계정 */}
        <MenuSection title="계정">
          <MenuItem
            href="/profile"
            icon={<User className="size-4" />}
            label="프로필 수정"
            desc="닉네임·프로필 사진 변경"
          />
          <MenuItem
            href="/my/applications"
            icon={<ClipboardList className="size-4" />}
            label="내 신청 내역"
            desc="입양·봉사 신청 현황 확인"
          />
          <MenuItem
            href="/my/donations"
            icon={<Heart className="size-4" />}
            label="내 후원 내역"
            desc="후원 기록 및 영수증 발급 안내"
          />
        </MenuSection>

        {/* 운영진 전용 */}
        {isStaff && (
          <MenuSection title="운영">
            <MenuItem
              href="/admin"
              icon={<Settings className="size-4" />}
              label="어드민 페이지"
              desc="관리자 대시보드"
              accent
            />
          </MenuSection>
        )}

        {/* 로그아웃 */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-5 py-4 text-left text-destructive transition-colors hover:bg-destructive/5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <LogOut className="size-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">로그아웃</span>
                <span className="block text-xs text-muted-foreground">계정에서 로그아웃합니다</span>
              </span>
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

function MenuSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <p className="border-b border-border/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function MenuItem({
  href,
  icon,
  label,
  desc,
  accent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  desc?: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-border/60 px-5 py-4 transition-colors last:border-0 hover:bg-secondary/50"
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
        accent ? "bg-primary/10 text-primary" : "bg-secondary text-foreground/70"
      }`}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${accent ? "text-primary" : "text-foreground"}`}>
          {label}
        </span>
        {desc && (
          <span className="block text-xs text-muted-foreground">{desc}</span>
        )}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
    </Link>
  )
}
