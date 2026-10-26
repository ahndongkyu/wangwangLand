import Image from "next/image"
import Link from "next/link"
import { User } from "lucide-react"

export function HeaderProfile({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  if (!name) return <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">로그인</Link>
  return <Link href="/my" title={name} aria-label={`${name} 마이페이지`} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
      {avatarUrl ? <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" /> : <User aria-hidden className="size-full p-1.5" />}
    </span>
    <span className="max-w-32 truncate">{name}</span>
  </Link>
}
