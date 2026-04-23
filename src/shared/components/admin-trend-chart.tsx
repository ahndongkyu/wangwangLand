"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface MonthlyRescueStat {
  month: string
  label: string
  rescued: number
}

export function AdminTrendChart({ data }: { data: MonthlyRescueStat[] }) {
  const max = Math.max(...data.map((d) => d.rescued), 1)
  const lastIdx = data.length - 1

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          domain={[0, max + 1]}
        />
        <Tooltip
          cursor={{ fill: "var(--color-secondary)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--color-foreground)",
          }}
          formatter={(value: number) => [`${value}마리`, "구조"]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar dataKey="rescued" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={
                i === lastIdx
                  ? "var(--color-primary)"
                  : "var(--color-primary)/0.4"
              }
              fillOpacity={i === lastIdx ? 1 : 0.45}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
