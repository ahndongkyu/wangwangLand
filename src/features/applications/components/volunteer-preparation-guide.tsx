export function VolunteerPreparationGuide() {
  return (
    <div className="rounded-xl bg-muted/60 p-4 text-sm leading-relaxed sm:p-5">
      <h3 className="mb-2 font-semibold">편한 복장으로 준비해 주세요</h3>
      <ul className="list-disc space-y-1.5 pl-4">
        <li>오염되어도 괜찮은 옷과 신발, 목장갑을 준비해 주세요. 장화도 좋아요.</li>
        <li>야외 견사 활동으로 먼지나 오물이 묻을 수 있고, 현장 물품 지원이 어려울 수 있습니다.</li>
        <li>활동은 당일 보호소 상황에 따라 현장에서 안내드립니다.</li>
      </ul>
      <p className="mt-4 border-t border-border pt-3">
        <strong className="font-semibold">신청만으로 방문이 확정되지는 않습니다.</strong>
        <br />문자로 승인 결과를 확인한 뒤 방문해 주세요.
      </p>
    </div>
  )
}
