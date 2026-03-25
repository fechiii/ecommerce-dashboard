"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MetricsBarChartProps {
  data: { name: string; sessions: number; pageViews: number }[];
  title?: string;
}

export default function MetricsBarChart({ data }: MetricsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "8px", fontSize: "11px" }}
          labelStyle={{ color: "#8b949e" }}
          itemStyle={{ color: "#fff" }}
        />
        <Bar dataKey="sessions" name="Sessions" fill="#FF9900" radius={[3,3,0,0]} />
        <Bar dataKey="pageViews" name="Page Views" fill="#58a6ff" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
