"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatNaira } from "@/lib/currency";

type Props = {
  data: { label: string; total: number }[];
};

export function RevenueBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#d8d8d2" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8f8f88", fontSize: 11, fontFamily: "Inter, sans-serif" }}
        />
        <Tooltip
          cursor={{ fill: "#eaf2ff" }}
          formatter={(value) => [formatNaira(Number(value)), "Revenue"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #d8d8d2",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
          }}
        />
        <Bar dataKey="total" fill="#004aad" radius={[8, 8, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
