export function smsStatusPresentation(state: string, code?: string) {
  if (code === "4000") return { label: "완료", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" }
  if (code === "2000" || code === "3000" || (!code && state === "pending")) return { label: "진행 중", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" }
  if (state === "failed") return { label: "실패", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" }
  return { label: "미확인", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" }
}
