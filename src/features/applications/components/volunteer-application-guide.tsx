import { Clock3, MessageCircle, Users } from "lucide-react"

import { SITE } from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"
import { VOLUNTEER_APPLICATION_TIME_LABEL } from "../lib/volunteer-operating-hours"

export function VolunteerApplicationGuide({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="volunteer-application-guide-title"
      className={cn(
        "rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-950/20",
        className
      )}
    >
      <h2
        id="volunteer-application-guide-title"
        className="text-sm font-bold text-amber-950 dark:text-amber-200"
      >
        신청 전 꼭 확인해 주세요
      </h2>

      <div className="mt-3 grid gap-2.5 text-sm text-amber-950/90 dark:text-amber-200/90">
        <div className="flex items-start gap-2.5">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">봉사 신청 가능 시간</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              {VOLUNTEER_APPLICATION_TIME_LABEL}
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              12:00~13:00는 점심시간으로 현장 안내가 어렵습니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">단체 신청은 2~30명까지</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              31명 이상 단체는 신청 전 카카오톡으로 일정을 문의해 주세요.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-amber-300/70 pt-3 dark:border-amber-700/50">
        <p className="text-xs leading-relaxed text-amber-950/90 dark:text-amber-200/90">
          신청 승인 결과는 문자로 안내드립니다. 승인 후 홈페이지의 봉사 안내와 준비물을 꼭 확인해 주세요.
        </p>
        <a
          href={SITE.sns.kakaoChannel}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-bold text-[#2B2B2B] transition-colors hover:bg-[#F7DC00] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-500/40"
        >
          <MessageCircle className="size-4" aria-hidden />
          카카오톡 문의하기
        </a>
      </div>
    </section>
  )
}

export function LargeGroupInquiry({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-200",
        className
      )}
    >
      <p className="text-sm font-semibold">31명 이상 단체인가요?</p>
      <p className="mt-1 text-xs leading-relaxed">
        신청 전 카카오톡으로 가능한 일정과 인원을 문의해 주세요.
      </p>
      <a
        href={SITE.sns.kakaoChannel}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-[#FEE500] px-3 py-1.5 text-xs font-bold text-[#2B2B2B] transition-colors hover:bg-[#F7DC00] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-500/40"
      >
        <MessageCircle className="size-3.5" aria-hidden />
        카카오톡 문의하기
      </a>
    </div>
  )
}
