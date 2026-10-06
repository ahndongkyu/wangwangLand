import { notFound } from "next/navigation"
import { getCurrentAdmin } from "@/features/auth"
import { getMaintenanceConfig } from "@/features/settings/api/queries"
import { MaintenanceSettings } from "./maintenance-settings"
import { getHomepageSettings, getManagedAnimals } from "@/features/settings/api/homepage-queries"
import { HomepageManager } from "@/features/settings/components/homepage-manager"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const admin = await getCurrentAdmin()
  if (!admin) notFound()

  const [settings, animals, maintenance] = await Promise.all([
    getHomepageSettings(), getManagedAnimals(), admin.role === "admin" ? getMaintenanceConfig() : null,
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">홈페이지 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">사진과 홈 노출 아이들, 사이트 운영 상태를 한곳에서 관리합니다.</p>
      </header>

      <HomepageManager initialPhotos={settings.photos} initialAutoFill={settings.autoFill} animals={animals} loadError={settings.error} maintenance={maintenance ? <MaintenanceSettings initialEnabled={maintenance.enabled} initialMessage={maintenance.message} initialEta={maintenance.eta}/> : null}/>
    </div>
  )
}
