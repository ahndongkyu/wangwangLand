"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu as MenuIcon, Search, X } from "lucide-react"
import { Menu } from "@base-ui/react/menu"
import { useState } from "react"

import { NoticeBadge } from "@/features/notices/components/notice-badge"
import type { RecentNoticeMeta } from "@/features/notices/types"
import { HEADER_NAV_GROUPS, MAIN_NAV, SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"
import { Button, buttonVariants } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"

interface HeaderProps {
  recentNotices?: RecentNoticeMeta[]
}

export function Header({ recentNotices = [] }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = searchValue.trim()
    if (!q) return
    router.push(`/dogs?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
    setSearchValue("")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center gap-4 px-4 md:px-6 lg:gap-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={SITE.logo}
            alt={`${SITE.name} 로고`}
            width={52}
            height={52}
            className="size-12 rounded-full md:size-13"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {SITE.name}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {SITE.subtitle}
            </span>
          </div>
        </Link>

        {/* Desktop nav — 그룹 드롭다운 + 단일 링크 혼합 */}
        <nav className="hidden md:flex">
          <ul className="flex items-center gap-0.5">
            {HEADER_NAV_GROUPS.map((node) =>
              node.kind === "link" ? (
                <li key={node.href}>
                  <Link
                    href={node.href}
                    className={cn(
                      "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(node.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {node.label}
                    {node.href === "/notice" && (
                      <NoticeBadge notices={recentNotices} />
                    )}
                  </Link>
                </li>
              ) : (
                <li key={node.label}>
                  <NavGroupDropdown
                    label={node.label}
                    items={node.items}
                    isActive={node.items.some((i) => isActive(i.href))}
                  />
                </li>
              )
            )}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* 검색 — 데스크톱/모바일 공용, 열리면 주소 바 스타일 인풋 */}
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label={searchOpen ? "검색 닫기" : "강아지 이름 검색"}
            aria-expanded={searchOpen}
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
          >
            {searchOpen ? (
              <X className="size-5" />
            ) : (
              <Search className="size-5" />
            )}
          </button>

          {/* CTA — 모바일에서도 항상 노출 (sm:inline-flex 제거) */}
          <Link
            href="/adopt"
            className={cn(buttonVariants({ size: "sm" }), "whitespace-nowrap")}
          >
            입양 문의
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  aria-label="메뉴 열기"
                />
              }
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{SITE.name}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 px-4">
                {MAIN_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "inline-flex items-center rounded-md px-3 py-3 text-base font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-secondary"
                    )}
                  >
                    {item.label}
                    {item.href === "/notice" && (
                      <NoticeBadge notices={recentNotices} />
                    )}
                  </Link>
                ))}
                <Link
                  href="/adopt"
                  onClick={() => setMobileOpen(false)}
                  className={cn(buttonVariants(), "mt-4")}
                >
                  입양 문의하기
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* 검색 드로어 — 오픈 시 헤더 아래 한 줄 */}
      {searchOpen && (
        <div className="border-t border-border/60 bg-background">
          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 md:px-6"
            role="search"
          >
            <Search
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="찾고 싶은 강아지 이름을 입력하세요 (예: 뽀삐)"
              className="flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm">
              검색
            </Button>
          </form>
        </div>
      )}
    </header>
  )
}

/** 데스크톱 드롭다운 그룹 */
function NavGroupDropdown({
  label,
  items,
  isActive,
}: {
  label: string
  items: ReadonlyArray<{ label: string; href: string; desc?: string }>
  isActive: boolean
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/80 hover:bg-secondary hover:text-foreground"
        )}
      >
        {label}
        <svg
          className="size-3.5 opacity-70"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup
            className={cn(
              "z-50 w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              "transition-all duration-150"
            )}
          >
            {items.map((item) => (
              <Menu.Item
                key={item.href}
                className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors data-[highlighted]:bg-secondary"
                render={<Link href={item.href} />}
              >
                <span className="font-medium text-foreground">
                  {item.label}
                </span>
                {item.desc && (
                  <span className="text-xs text-muted-foreground">
                    {item.desc}
                  </span>
                )}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
