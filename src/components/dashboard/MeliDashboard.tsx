"use client";
import { useState, useEffect, useCallback } from "react";
import StatCard from "@/components/StatCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Package, ShoppingCart, MessageCircle, RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Client } from "@/lib/clients";
import Link from "next/link";

interface AccountMetrics {
  accountId: string;
  sellerId: string;
  period: { from: string; to: string };
  totalSales: number;
  totalOrders: number;
  canceledOrders: number;
  totalUnits: number;
  currency: string;
  salesByDate: { date: string; sales: number; orders: number }[];
  topItems: { id: string; title: string; units: number; sales: number }[];
  pendingQuestions: number;
  error?: string;
}

function dateRange(days: number) {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  return { from, to };
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs">
      <p className="text-[#8b949e] mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white">{formatCurrency(p.value, "ARS")}</span>
        </div>
      ))}
    </div>
  );
};

export default function MeliDashboard({ client }: { client: Client }) {
  const [metrics, setMetrics] = useState<AccountMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    if (!client.meliAccount) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = dateRange(days);
      const res = await fetch(`/api/meli?account=${client.meliAccount}&from=${from}&to=${to}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Error Meli");
      const json = await res.json();
      // La API devuelve el objeto directo si es una sola cuenta
      setMetrics(json.accountId ? json : json.accounts?.[0] ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [client.meliAccount, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!client.meliAccount) return null;

  const chartData = (metrics?.salesByDate ?? []).map((d) => ({
    date: d.date.slice(5),
    sales: d.sales,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-semibold text-sm">{client.label} — Mercado Libre</h2>
          <p className="text-[#8b949e] text-xs mt-0.5">Seller ID {client.meliSellerId}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${days === d ? "bg-[#30363d] text-white" : "text-[#8b949e] hover:text-white"}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Ventas"            value={loading ? "—" : formatCurrency(metrics?.totalSales ?? 0, metrics?.currency ?? "ARS")} change={0} icon={DollarSign}    iconColor="text-[#FFE600]" subtitle={`últimos ${days} días`}  loading={loading} />
        <StatCard title="Órdenes Pagadas"   value={loading ? "—" : formatNumber(metrics?.totalOrders ?? 0)}    change={0} icon={ShoppingCart}   iconColor="text-[#3fb950]" subtitle="estado: paid"        loading={loading} />
        <StatCard title="Unidades"          value={loading ? "—" : formatNumber(metrics?.totalUnits ?? 0)}     change={0} icon={Package}        iconColor="text-[#58a6ff]" subtitle="ítems despachados"   loading={loading} />
        <StatCard title="Canceladas"        value={loading ? "—" : formatNumber(metrics?.canceledOrders ?? 0)} change={0} icon={TrendingUp}     iconColor="text-red-400"   subtitle="en el período"       loading={loading} />
        <StatCard title="Preguntas"         value={loading ? "—" : formatNumber(metrics?.pendingQuestions ?? 0)} change={0} icon={MessageCircle} iconColor="text-purple-400" subtitle="sin responder"     loading={loading} />
      </div>

      {/* Chart + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm">Ventas por Fecha</h3>
            <p className="text-[#8b949e] text-xs mt-0.5">Órdenes pagadas — últimos {days} días</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-[#8b949e] text-sm">Cargando datos...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradMeli" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FFE600" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFE600" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="sales" name="Ventas" stroke="#FFE600" fill="url(#gradMeli)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#8b949e] text-sm">Sin ventas en el período</div>
          )}
        </div>

        {/* Quick stats + questions link */}
        <div className="space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold text-sm">Resumen</h3>
            <div className="space-y-2">
              {[
                { label: "Ticket promedio", value: metrics && metrics.totalOrders > 0 ? formatCurrency(metrics.totalSales / metrics.totalOrders, metrics.currency) : "—" },
                { label: "Tasa cancelación", value: metrics && metrics.totalOrders + metrics.canceledOrders > 0 ? `${((metrics.canceledOrders / (metrics.totalOrders + metrics.canceledOrders)) * 100).toFixed(1)}%` : "—" },
                { label: "Período", value: metrics ? `${metrics.period.from} → ${metrics.period.to}` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[#8b949e] text-xs">{label}</span>
                  <span className="text-white text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions shortcut */}
          {(metrics?.pendingQuestions ?? 0) > 0 && (
            <Link href="/meli/questions" className="flex items-center gap-3 bg-[#f0b429]/10 border border-[#f0b429]/30 rounded-xl p-4 hover:bg-[#f0b429]/15 transition-all">
              <MessageCircle size={18} className="text-[#f0b429] flex-shrink-0" />
              <div>
                <p className="text-[#f0b429] text-sm font-medium">{metrics!.pendingQuestions} pregunta{metrics!.pendingQuestions !== 1 ? "s" : ""} sin responder</p>
                <p className="text-[#8b949e] text-xs">Click para responder</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Top items table */}
      {(metrics?.topItems?.length ?? 0) > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363d]">
            <h3 className="text-white font-semibold text-sm">Top Productos</h3>
            <p className="text-[#8b949e] text-xs mt-0.5">Por ventas en el período</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {["Item ID", "Título", "Unidades", "Ventas"].map((h) => (
                    <th key={h} className="text-left text-[11px] font-medium text-[#8b949e] px-5 py-3 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics!.topItems.map((item, i) => (
                  <tr key={item.id} className={`border-b border-[#30363d]/50 hover:bg-[#0d1117]/50 transition-colors ${i === metrics!.topItems.length - 1 ? "border-0" : ""}`}>
                    <td className="px-5 py-3">
                      <code className="text-[#FFE600] text-xs font-mono bg-[#FFE600]/10 px-2 py-0.5 rounded">{item.id}</code>
                    </td>
                    <td className="px-5 py-3 text-white text-sm max-w-xs truncate">{item.title}</td>
                    <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(item.units)}</td>
                    <td className="px-5 py-3 text-white text-sm font-medium">{formatCurrency(item.sales, metrics?.currency ?? "ARS")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
