"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface MonthlyStat {
  month: string
  label: string
  rescued: number
}

export function AdminTrendChart({ data, valueLabel = "건" }: { data: MonthlyStat[]; valueLabel?: string }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">통계 데이터를 불러오지 못했습니다.</p>
  }
  return (
    <div className="min-w-0">
      <p className="mb-3 text-xs text-muted-foreground">단위: {valueLabel} · 완료된 월 기준</p>
      <div role="img" aria-label={data.map((row) => `${row.month}: ${row.rescued}${valueLabel}`).join(", ")}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 16, right: 16, left: -16, bottom: 8 }} accessibilityLayer>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} formatter={(value) => [`${value}${valueLabel}`, "합계"]} />
            <Line type="linear" dataKey="rescued" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary">월별 수치 표로 보기</summary>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">월별 집계 수치</caption>
          <thead><tr className="border-b border-border"><th scope="col" className="py-2">월</th><th scope="col" className="py-2 text-right">합계 ({valueLabel})</th></tr></thead>
          <tbody>{data.map((row) => <tr key={row.month} className="border-b border-border"><th scope="row" className="py-2 font-normal">{row.month}</th><td className="py-2 text-right tabular-nums">{row.rescued}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}
