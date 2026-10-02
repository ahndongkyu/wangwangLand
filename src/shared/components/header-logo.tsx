import Image from "next/image"
import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

/** 테마 클래스에 따라 전환해 초기 렌더링과 토글 상태를 일치시킨다. */
export function HeaderLogo({ className, sizes = "180px", priority = false }: {
  className?: string
  sizes?: string
  priority?: boolean
}) {
  return <span className={cn("block shrink-0", className)}>
    <Image src={SITE.headerLogo} alt={SITE.name} width={2172} height={724} sizes={sizes} fetchPriority={priority ? "high" : undefined} className="block h-auto w-full dark:hidden" />
    <Image src={SITE.headerLogoDark} alt={SITE.name} width={2172} height={724} sizes={sizes} fetchPriority={priority ? "high" : undefined} className="hidden h-auto w-full dark:block" />
  </span>
}
