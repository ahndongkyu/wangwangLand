import { getMaintenanceMessage } from "@/features/settings/api/queries"

export const dynamic = "force-dynamic"

export default async function MaintenancePage() {
  const message = await getMaintenanceMessage()

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
          잠시 점검 중입니다<span className="dots" />
        </h1>

        <p className="mt-3 max-w-sm whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          서버 점검 중
        </div>
      </div>
    </>
  )
}
