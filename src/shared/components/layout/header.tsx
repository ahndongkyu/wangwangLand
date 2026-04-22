"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, Menu as MenuIcon, Search, X } from "lucide-react"
import { Menu } from "@base-ui/react/menu"
import { useState } from "react"

import { NoticeBadge } from "@/features/notices/components/notice-badge"
import type { RecentNoticeMeta } from "@/features/notices/types"
import {
  BrandIcon,
  type BrandIconName,
} from "@/shared/components/brand-icon"
import {
  HEADER_NAV_GROUPS,
  type HeaderNavItem,
  MAIN_NAV,
  SITE,
} from "@/shared/constants/site"
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
    <header
      className={cn(
        // 솔리드 흰색 + 부드러운 하단 라인 + 살짝의 그림자로 바(bar) 형태 강조.
        // 배너 위에 있어도 경계가 명확하고, 드롭다운이 이 바에서 흘러내려오는 느낌.
        "sticky top-0 z-40 w-full bg-white",
        "border-b border-[#FBE4D2] shadow-[0_2px_8px_rgba(139,111,71,0.06)]"
      )}
    >
      {/*
        3열 그리드로 로고 / 네비 / 액션 배치 — 중앙 열(1fr)이 뷰포트 가운데에
        고정되므로 로고·액션 폭이 달라도 네비가 시각적으로 정확히 중앙.
      */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:grid md:h-20 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6 lg:gap-8">
        <Link href="/" className="flex items-center gap-3 justify-self-start">
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

        {/* Desktop nav — 3열 그리드의 중앙 열 (모바일에선 자리만 차지하고 숨김). */}
        <nav className="hidden justify-center md:flex">
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

        <div className="flex items-center justify-end gap-2 justify-self-end">
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
        <div className="border-t border-[#FBE4D2] bg-white">
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
  items: ReadonlyArray<HeaderNavItem>
  isActive: boolean
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "group/trig inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          // 열렸을 때도 active 톤 유지 (사용자가 어디서 열었는지 명확)
          "data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/80 hover:bg-secondary hover:text-foreground"
        )}
      >
        {label}
        <ChevronDown
          className="size-3.5 opacity-70 transition-transform duration-200 group-data-[popup-open]/trig:rotate-180"
          aria-hidden
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={12} align="center">
          <Menu.Popup
            className={cn(
              // 240px 너비, 솔리드 흰 배경, 따뜻한 코랄 테두리, 깊은 그림자
              "relative z-50 w-60 overflow-visible rounded-xl border border-[#FBE4D2] bg-white p-1.5",
              "shadow-[0_12px_32px_rgba(139,111,71,0.15)]",
              // 부드러운 fade + slide-down 애니메이션
              "data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0",
              "data-[ending-style]:-translate-y-1 data-[ending-style]:opacity-0",
              "transition-[transform,opacity] duration-200 ease-out"
            )}
          >
            {/* 위로 향하는 화살표 — 트리거 버튼과 시각 연결 */}
            <span
              aria-hidden
              className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l border-t border-[#FBE4D2] bg-white"
            />

            {items.map((item) => (
              <Menu.Item
                key={item.href}
                className={cn(
                  "group/item relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm outline-none text-foreground",
                  // 옵션 A: hover 시 살짝 위로 떠오름 + 배경 변화
                  // (Tailwind v4 data-[highlighted] variant 가 본 프로젝트에서
                  // translate 적용 안 돼 hover 로 통일. 키보드 nav 시각도 같이 잡으려면
                  // data-[highlighted] 를 추가로 두면 되지만 마우스 케이스가 95%+)
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:bg-[#FAF3E7]"
                )}
                render={<Link href={item.href} />}
              >
                {item.icon && (
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF3E7]",
                      // 옵션 B: 항목 hover 시 아이콘 박스가 코랄 톤으로 전환
                      "transition-colors duration-200",
                      "group-hover/item:bg-primary/30"
                    )}
                  >
                    <BrandIcon
                      name={item.icon as BrandIconName}
                      size={22}
                      decorative
                    />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-foreground">
                    {item.label}
                  </span>
                  {item.desc && (
                    <span className="text-xs leading-snug text-muted-foreground">
                      {item.desc}
                    </span>
                  )}
                </span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
