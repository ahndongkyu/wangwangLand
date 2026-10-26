import { notFound } from "next/navigation"
import { getCurrentAdmin } from "@/features/auth"
import { getOperatingInfo } from "@/features/settings/api/operating-queries"
import { OperatingManager } from "@/features/settings/components/operating-manager"
import { getHomepageSettings, getManagedAnimals } from "@/features/settings/api/homepage-queries"
import { HomepageManager } from "@/features/settings/components/homepage-manager"
import { getAdminPopups } from "@/features/settings/api/popup-queries"
import { PopupManager } from "@/features/settings/components/popup-manager"
import { getMaintenanceConfig } from "@/features/settings/api/queries"
import { MaintenanceSettings } from "../maintenance-settings"

const titles: Record<string, [string, string]> = {
  photos: ["홈페이지 관리", "사이트 사진"], animals: ["홈페이지 관리", "홈 노출 아이들"],
  popups: ["홈페이지 관리", "팝업"], delivery: ["운영 설정", "배송 안내"],
  contact: ["운영 설정", "연락처·SNS"], account: ["운영 설정", "후원 계좌"],
  maintenance: ["시스템 관리", "점검 모드"],
}
export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) notFound()
  const { section } = await params
  if (!Object.hasOwn(titles, section) || section === "maintenance" && admin.role !== "admin") notFound()
  let content
  if (section === "delivery" || section === "contact" || section === "account") {
    content = <OperatingManager key={section} section={section} initial={await getOperatingInfo()} />
  } else if (section === "photos" || section === "animals") {
    const settings = await getHomepageSettings()
    const animals = section === "animals" ? await getManagedAnimals() : []
    content = <HomepageManager key={section} section={section} initialPhotos={settings.photos} initialAutoFill={settings.autoFill} animals={animals} loadError={settings.error} maintenance={null} />
  } else if (section === "popups") {
    const settings = await getAdminPopups()
    content = <PopupManager initialPopups={settings.popups} loadError={settings.error} />
  } else {
    const config = await getMaintenanceConfig()
    content = <MaintenanceSettings initialEnabled={config.enabled} initialMessage={config.message} initialEta={config.eta} />
  }
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
    <header className="mb-6"><p className="mb-2 text-sm text-muted-foreground">{titles[section][0]}</p><h1 className="text-2xl font-bold">{titles[section][1]}</h1></header>
    {content}
  </div>
}
