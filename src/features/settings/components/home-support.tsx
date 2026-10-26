import { getOperatingInfo } from "../api/operating-queries"
import { DeliveryCard } from "./delivery-card"
import { CopyButton } from "@/shared/components/copy-button"

export async function HomeSupport() {
  const settings = await getOperatingInfo()
  const account = settings.account.data
  return <section className="order-1 mt-5 rounded-xl border border-border bg-card p-4 sm:p-6" aria-label="후원 안내">
    <h2 className="text-lg font-semibold">아이들의 일상을 함께 지켜주세요</h2>
    <p className="mt-2 text-sm text-muted-foreground">계좌 후원과 물품 후원으로 함께하실 수 있습니다.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-xl bg-muted/40 p-5 [overflow-wrap:anywhere]" aria-label="후원 계좌">
        <p className="text-xs font-medium text-muted-foreground">계좌 후원</p><h3 className="mt-1 mb-4 text-lg font-semibold">후원금 보내실 곳</h3>
        {account ? <><p className="font-semibold">{account.bankName} {account.accountNumber}</p><p className="mt-3 text-sm text-muted-foreground">예금주: {account.accountHolder}</p><div className="mt-3"><CopyButton value={account.accountNumber} label="계좌번호" textLabel="계좌번호 복사" className="min-h-11 px-3" /></div></> : <p className="text-sm">계좌 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>}
      </section>
      <DeliveryCard data={settings.delivery.data} />
    </div>
  </section>
}
