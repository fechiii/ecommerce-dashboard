import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function StatCard({ title, value, change, icon: Icon, iconColor = "text-blue-400", subtitle, loading }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#58a6ff]/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg bg-[#0d1117]", iconColor)}>
          <Icon size={18} />
        </div>
        {!loading && change !== undefined && change !== 0 && (
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", isPositive ? "bg-[#3fb950]/10 text-[#3fb950]" : "bg-[#f85149]/10 text-[#f85149]")}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-[#8b949e] text-xs mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-[#30363d] rounded animate-pulse mt-1" />
      ) : (
        <p className="text-white text-2xl font-bold">{value}</p>
      )}
      {subtitle && <p className="text-[#8b949e] text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
