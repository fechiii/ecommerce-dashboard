"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SalesChartProps {
  data: { date: string; us: number; eu: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs">
      <p className="text-[#8b949e] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white">{p.name}: ${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradUS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF9900" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FF9900" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradEU" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b949e" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8b949e" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "12px", color: "#8b949e" }} />
        <Area type="monotone" dataKey="us" name="USA" stroke="#FF9900" fill="url(#gradUS)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="eu" name="EU/UK" stroke="#58a6ff" fill="url(#gradEU)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
