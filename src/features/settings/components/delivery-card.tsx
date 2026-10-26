import { CopyButton } from "@/shared/components/copy-button"
import type { OperatingInfo } from "../lib/operating-info"

export function DeliveryCard({ data }: { data: OperatingInfo["delivery"] | null }) {
  return <section className="min-w-0 rounded-xl bg-primary/5 p-5 [overflow-wrap:anywhere]" aria-label="후원물품 배송 주소">
    <p className="text-xs font-medium text-muted-foreground">물품 후원</p>
    <h3 className="mt-1 mb-4 text-lg font-semibold">후원물품 보내실 곳</h3>
    {data ? <>
      <p className="text-base font-semibold">{data.address}</p>
      {data.detail && <p className="mt-1 text-sm">{data.detail}</p>}
      <p className="mt-3 text-sm text-muted-foreground">받는 사람: {data.recipient}</p>
      {data.phone && <p className="mt-1 text-sm text-muted-foreground">수령 연락처: <a href={`tel:${data.phone.replace(/\D/g, "")}`} className="underline">{data.phone}</a></p>}
      <div className="mt-3"><CopyButton value={[data.address, data.detail].filter(Boolean).join(" ")} label="배송 주소" textLabel="배송 주소 복사" className="min-h-11 px-3" /></div>
      {data.note && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{data.note}</p>}
    </> : <p className="text-sm text-muted-foreground">배송 주소를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>}
  </section>
}
