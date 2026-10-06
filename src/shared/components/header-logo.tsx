import Image from "next/image"
import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"

/** 테마 클래스에 따라 전환해 초기 렌더링과 토글 상태를 일치시킨다. */
export function HeaderLogo({ className, variant = "color" }: {
  className?: string
  variant?: "mono" | "color"
}) {
  if (variant === "color") {
    return <span className={cn("block shrink-0", className)}>
      <Image src={SITE.headerLogo} alt={SITE.name} width={2172} height={724} sizes="(min-width: 1024px) 234px, 162px" className="block h-auto w-full dark:hidden" />
      <Image src={SITE.headerLogoDark} alt={SITE.name} width={2172} height={724} sizes="(min-width: 1024px) 234px, 162px" className="hidden h-auto w-full dark:block" />
    </span>
  }
  return <span
    role="img"
    aria-label={SITE.name}
    className={cn("block aspect-[2169/725] shrink-0 bg-black dark:bg-white", className)}
    style={{
      maskImage: `url("${SITE.headerLogoMono}")`,
      maskSize: "contain",
      maskPosition: "center",
      maskRepeat: "no-repeat",
      WebkitMaskImage: `url("${SITE.headerLogoMono}")`,
      WebkitMaskSize: "contain",
      WebkitMaskPosition: "center",
      WebkitMaskRepeat: "no-repeat",
    }}
  />
}
