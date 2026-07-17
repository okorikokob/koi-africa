"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Cycled per category slice — kept in sync with KOI's semantic token hex values.
const PALETTE = ["#004aad", "#5ba3ff", "#14ae5c", "#f5a524", "#0091ff", "#e5484d"];

type Slice = { name: string; pct: number };

type Props = {
  data: Slice[];
};

export function CategoryDonutChart({ data }: Props) {
  return (
    <div className="flex items-center gap-6">
      <div className="h-[168px] w-[168px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pct"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value}%`, name]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #d8d8d2",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-semibold text-text-primary">
              {entry.name}
            </span>
            <span className="shrink-0 font-sans text-xs font-extrabold text-text-secondary">
              {entry.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
