"use client"

export function EventConflictNotice({ editing = false }: { editing?: boolean }) {
  return <div role="alert" className="w-full min-w-0 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm text-foreground">
    <p className="font-semibold">최신 일정 확인이 필요합니다</p>
    <p className="mt-2 leading-relaxed">다른 담당자가 일정을 변경했거나 삭제했습니다. 이번 요청은 적용하지 않았으며 알림도 보내지 않았습니다.</p>
    {editing && <p className="mt-2 text-muted-foreground">입력한 내용은 현재 화면에 유지됩니다. 새로 불러오면 저장하지 않은 입력은 사라집니다.</p>}
    <button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 rounded-md border border-border bg-card px-4 font-medium hover:bg-secondary">최신 일정 불러오기</button>
  </div>
}
