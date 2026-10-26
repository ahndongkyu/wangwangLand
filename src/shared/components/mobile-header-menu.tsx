"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet"

/** 배경 페이지는 잠그고 메뉴 전체에 하나의 스크롤만 둔다. */
export function MobileHeaderMenu({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant="ghost" className="size-11 p-0" aria-label="메뉴 열기" />}><Menu aria-hidden className="size-5" /></SheetTrigger>
    <SheetContent side="left" showCloseButton={false} className="gap-0 overflow-y-auto bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] data-[side=left]:w-full data-[side=left]:sm:max-w-none">
      <div className="flex shrink-0 items-center justify-between">
        <SheetHeader className="p-0"><SheetTitle>{title}</SheetTitle></SheetHeader>
        <SheetClose render={<Button variant="ghost" className="size-11 p-0" aria-label="메뉴 닫기" />}><X aria-hidden className="size-5" /></SheetClose>
      </div>
      <div className="mt-3" onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false) }}>{children}</div>
    </SheetContent>
  </Sheet>
}
