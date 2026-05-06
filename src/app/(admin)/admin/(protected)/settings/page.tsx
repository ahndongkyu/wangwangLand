import { getMaintenanceMode } from "@/features/settings/api/queries"
import { MaintenanceToggle } from "./maintenance-toggle"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const isOn = await getMaintenanceMode()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">사이트 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">홈페이지 운영 상태를 관리합니다.</p>
      </header>

      <MaintenanceToggle initialValue={isOn} />
    </div>
  )
}
