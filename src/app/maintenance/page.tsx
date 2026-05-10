export const dynamic = "force-dynamic"

export default function MaintenancePage() {
  return (
    <>
      <style>{`
        @keyframes blink-dots {
          0%, 20%  { content: ""; }
          40%      { content: "."; }
          60%      { content: ".."; }
          80%, 100%{ content: "..."; }
        }
        .dots::after {
          content: "";
          animation: blink-dots 1.6s steps(1, end) infinite;
        }
      `}</style>

      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <div className="mb-6 text-6xl">🐾</div>

        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          긴급 점검 중입니다<span className="dots" />
        </h1>

        <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
          현재 서버 긴급 점검으로 일시 접속이 어렵습니다.
          <br />
          <span className="font-semibold text-foreground">오늘 안으로 정상화</span> 예정이니
          잠시 후 다시 방문해 주세요 🙏
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-semibold">최신 소식은 SNS에서 확인해 주세요</p>
          <p className="mt-1.5 text-xs">
            인스타그램 <span className="font-semibold">@wangwangland_</span>
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          긴급 점검 중
        </div>
      </div>
    </>
  )
}
