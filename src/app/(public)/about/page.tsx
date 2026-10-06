import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { ChevronDown } from "lucide-react"
import { CopyButton } from "@/shared/components/copy-button"
import { buttonVariants } from "@/shared/components/ui/button"
import { SITE } from "@/shared/constants/site"
import { getSiteStats } from "@/shared/lib/stats"
import { cn } from "@/shared/lib/utils"
import { getHomepageSettings } from "@/features/settings/api/homepage-queries"

export const metadata: Metadata = {
  title: "센터 소개",
  description: "영종도 유기견 보호소 왕왕랜드의 활동과 운영, 방문 방법을 안내합니다.",
}
export const revalidate = 0

const FAQ_ITEMS = [
  {
    question: "입양은 어떻게 진행되나요?",
    answer:
      "강아지·고양이 페이지에서 만나고 싶은 아이를 확인한 뒤 입양 문의 폼을 작성해 주세요. 운영진 검토와 연락, 통화·방문 상담, 가정 점검을 거쳐 입양이 확정됩니다. 입양 후에도 아이의 근황을 함께 나눠주세요.",
  },
  {
    question: "봉사는 누구나 신청할 수 있나요?",
    answer:
      "만 14세 이상이면 누구나 신청할 수 있습니다. 개인은 물론 단체·기업 봉사도 환영하며, 신청 후 운영진이 일정을 확인해 안내드립니다.",
  },
  {
    question: "후원금은 어떻게 사용되나요?",
    answer:
      "후원금은 사료와 간식, 예방접종·중성화·치료 등의 병원비, 시설 유지비와 보호소 운영에 필요한 소모품 구입에 사용됩니다.",
  },
  {
    question: "기부금영수증 발급이 가능한가요?",
    answer:
      "현재는 공익성 단체 등록 전이라 기부금영수증 발급이 어렵습니다. 후원 기록은 보관하고 있으며, 등록 완료 후 안내드리겠습니다.",
  },
  {
    question: "임시보호도 가능한가요?",
    answer:
      "가능합니다. 입양 전 일정 기간 가정에서 아이를 돌보는 방식이며, 자세한 조건과 지원 범위는 운영진과 상담 후 결정합니다.",
  },
] as const


export default async function AboutPage() {
  const [stats, homepage] = await Promise.all([getSiteStats(), getHomepageSettings()])
  const photo = homepage.photos.about
  const links = "inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className="min-w-0 px-4 py-8 text-foreground sm:px-6 md:py-10">
      <section className="grid items-center gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
        <div>
          <p className="mb-4 text-xs font-semibold text-primary">센터 소개</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">영종도 유기견 보호소,<br /><span className="mt-1 inline-block">왕왕랜드</span></h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">구조된 아이들을 돌보고, 새로운 가족을 만날 수 있도록 입양과 봉사를 연결합니다.</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">아이들이 안심하고 지낼 수 있는 하루를 함께 만듭니다.</p>
          <a href="#about-visit" className={cn(links, "mt-5")}>처음 방문하시나요? 방문 안내 →</a>
        </div>
        <figure className="overflow-hidden rounded-2xl">
          <div className="relative aspect-[4/3] bg-muted">
            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 1024px) 100vw, 540px" className="object-cover" style={{ objectPosition: `${photo.x}% ${photo.y}%` }} priority />
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground">왕왕랜드에서 함께하는 일상</figcaption>
        </figure>
      </section>

      <section className="mt-12 rounded-2xl bg-muted/55 p-5 sm:p-8 md:mt-16 dark:bg-muted/65" aria-labelledby="about-work">
        <Heading id="about-work" title="왕왕랜드가 하는 일" description="구조 이후의 돌봄부터 새로운 가족과의 만남까지 함께합니다." />
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            ["01", "구조와 보호", "도움이 필요한 아이를 구조하고 안전하게 지낼 공간을 마련합니다."],
            ["02", "회복과 돌봄", "식사와 건강을 챙기고, 사람과 가까워질 수 있도록 돌봅니다."],
            ["03", "입양 연결", "아이에게 맞는 가족을 찾고, 입양 후에도 소식을 나눕니다."],
          ].map(([number, title, desc]) => <div key={number}><p className="mb-2 text-xs font-semibold tracking-widest text-primary">{number}</p><h3 className="text-base font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p></div>)}
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <dl className="grid grid-cols-2 divide-x divide-border/60 overflow-hidden rounded-2xl bg-background/80 text-center">
            <Impact label="입양 완료" value={stats.adopted} unit="마리" />
            <Impact label="누적 봉사자" value={stats.volunteers} unit="명" />
          </dl>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">입양 완료는 등록된 강아지·고양이 기준입니다.<br />누적 봉사자는 승인된 신청 인원 합계이며, 반복 참여를 포함합니다.</p>
        </div>
      </section>

      <section className="mt-12 md:mt-16" aria-labelledby="about-life">
        <Heading id="about-life" title="일상과 운영을 기록합니다" description="아이들의 소식과 후원금 사용 내역을 게시판에서 확인하실 수 있습니다." />
        <div className="grid gap-4 md:grid-cols-2">
          <RecordLink href="/daily?category=일상" title="보호소의 일상" description="식사와 건강 확인, 산책과 공간 관리. 아이들과 함께하는 하루를 나눕니다." action="일상 보기" />
          <RecordLink href="/expenses" title="후원금 사용 내역" description="아이들의 치료와 생활, 보호소 운영에 사용한 지출 내역을 공개합니다." action="지출내역 보기" note="회원 로그인 후 확인할 수 있습니다." />
        </div>
      </section>

      <section id="about-visit" className="mt-12 scroll-mt-28 rounded-2xl bg-secondary/45 p-5 sm:p-8 md:mt-16 dark:bg-secondary/65" aria-labelledby="about-visit-heading">
        <Heading id="about-visit-heading" title="방문 전 확인해 주세요" description="봉사 신청 또는 입양 문의 후, 운영진의 안내에 따라 방문해 주세요." />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h3 className="text-sm font-semibold">보호소 위치</h3>
            <p className="mt-3 text-base font-semibold leading-7">{SITE.contact.address}</p>
            {SITE.contact.addressNote && <p className="mt-2 text-sm text-muted-foreground">{SITE.contact.addressNote}</p>}
            <div className="mt-3"><CopyButton value={SITE.contact.address} label="주소" /></div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>네이버 지도</a>
              <a href={`https://map.kakao.com/?q=${encodeURIComponent(SITE.contact.mapQuery || SITE.contact.address)}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>카카오 지도</a>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">단체 정보</h3>
            <dl className="space-y-3 text-sm">
              {SITE.registration.representativeName && <Info label="대표자" value={SITE.registration.representativeName} />}
              {SITE.registration.taxId && <Info label="고유번호" value={SITE.registration.taxId} />}
              {SITE.registration.shelterNumber && <Info label="등록번호" value={SITE.registration.shelterNumber} />}
              <Info label="운영 형태" value="비영리 동물 보호 단체" />
            </dl>
          </div>
        </div>
      </section>

      <section className="mt-12 md:mt-16" aria-labelledby="about-faq">
        <Heading id="about-faq" title="자주 묻는 질문" />
        <div className="divide-y divide-border/60">
          {FAQ_ITEMS.map(item => <details key={item.question} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 text-sm font-semibold transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{item.question}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden /></summary>
            <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>)}
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-muted/55 p-5 sm:p-8 md:mt-16 dark:bg-muted/65">
        <h2 className="text-xl font-bold tracking-tight">가능한 방식으로 함께해 주세요</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">봉사로 시간을 나누고, 입양과 후원으로 아이들의 생활을 함께 지켜주세요.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/volunteer" className={cn(buttonVariants(), "min-h-11")}>봉사 신청</Link>
          <Link href="/adopt" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>입양 문의</Link>
          <Link href="/donate" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>후원하기</Link>
        </div>
      </section>
    </div>
  )
}

function Heading({ id, title, description }: { id: string; title: string; description?: string }) {
  return <header className="mb-6"><h2 id={id} className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}</header>
}
function Impact({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return <div className="px-3 py-5 sm:py-6"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value === null ? <span className="text-base font-medium">확인 중</span> : <>{value.toLocaleString()}<span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span></>}</dd></div>
}
function RecordLink({ href, title, description, action, note }: { href: string; title: string; description: string; action: string; note?: string }) {
  return <Link href={href} className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"><h3 className="text-base font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>{note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}<span className="mt-auto pt-5 text-sm font-semibold text-primary">{action} <span aria-hidden>→</span></span></Link>
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>
}
