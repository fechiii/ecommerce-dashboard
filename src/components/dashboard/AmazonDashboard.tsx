"use client";
import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import SalesChart from "@/components/SalesChart";
import MetricsBarChart from "@/components/MetricsBarChart";
import { DollarSign, Package, Eye, ShoppingCart, Activity, RefreshCw } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { Client } from "@/lib/clients";
import { useDateRange } from "@/lib/DateContext";

interface DashboardData {
  stats: { totalSales: number; totalUnits: number; totalPageViews: number; avgBuyBox: number };
  salesChart: { date: string; us: number; eu: number }[];
  trafficChart: { name: string; sessions: number; pageViews: number }[];
  topAsins: { asin: string; sales: number; units: number; buyBox: number; pageViews: number }[];
  meta: { avgSessions: number; conversionRate: number; rowsUS: number; rowsEU: number };
}

export default function AmazonDashboard({ client }: { client: Client }) {
  const { range } = useDateRange();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState("");

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?from=${range.from}&to=${range.to}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Error al cargar datos");
      }
      setData(await res.json());
      setLastSync(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDashboard(); }, [range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">{client.label} — Amazon</h2>
          <p className="text-[#8b949e] text-xs mt-0.5">
            {range.label} · {client.amazonRegions?.join(" · ") ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <Activity size={12} className="text-[#3fb950]" />
              <span>Sync: {lastSync}</span>
            </div>
          )}
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas Totales"     value={data ? formatCurrency(data.stats.totalSales) : "—"}       change={0} icon={DollarSign}  iconColor="text-[#FF9900]" subtitle="Datos del Sheet" loading={loading} />
        <StatCard title="Unidades Vendidas"  value={data ? formatNumber(data.stats.totalUnits) : "—"}         change={0} icon={Package}     iconColor="text-[#58a6ff]" subtitle="Datos del Sheet" loading={loading} />
        <StatCard title="Page Views"         value={data ? formatNumber(data.stats.totalPageViews) : "—"}     change={0} icon={Eye}         iconColor="text-purple-400" subtitle="Datos del Sheet" loading={loading} />
        <StatCard title="Buy Box %"          value={data ? formatPercent(data.stats.avgBuyBox) : "—"}         change={0} icon={ShoppingCart} iconColor="text-[#3fb950]" subtitle="Promedio US" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm">Ventas por Marketplace</h3>
            <p className="text-[#8b949e] text-xs mt-0.5">USA vs EU/UK — últimos 14 días</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-[#8b949e] text-sm">Cargando datos...</div>
          ) : data && data.salesChart.length > 0 ? (
            <SalesChart data={data.salesChart} />
          ) : (
            <div className="h-48 flex items-center justify-center text-[#8b949e] text-sm">Sin datos disponibles</div>
          )}
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold text-sm">Tráfico</h3>
            <p className="text-[#8b949e] text-xs mt-0.5">Sessions & Page Views</p>
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-[#8b949e] text-sm">Cargando...</div>
          ) : data && data.trafficChart.length > 0 ? (
            <>
              <MetricsBarChart data={data.trafficChart} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                  <p className="text-[#8b949e] text-[10px]">Avg Sessions</p>
                  <p className="text-white font-bold text-sm">{formatNumber(data.meta.avgSessions)}</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                  <p className="text-[#8b949e] text-[10px]">Conversión</p>
                  <p className="text-white font-bold text-sm">{data.meta.conversionRate}%</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-[#8b949e] text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Top ASINs */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div>
            <h3 className="text-white font-semibold text-sm">Top ASINs</h3>
            <p className="text-[#8b949e] text-xs mt-0.5">
              {data ? `${data.meta.rowsUS} filas US · ${data.meta.rowsEU} filas EU` : "Cargando..."}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d]">
                {["ASIN", "Ventas", "Unidades", "Buy Box %", "Page Views", "Estado"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium text-[#8b949e] px-5 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[#8b949e] text-sm">Cargando datos del Sheet...</td></tr>
              ) : data && data.topAsins.length > 0 ? (
                data.topAsins.map((row, i) => (
                  <tr key={row.asin} className={`border-b border-[#30363d]/50 hover:bg-[#0d1117]/50 transition-colors ${i === data.topAsins.length - 1 ? "border-0" : ""}`}>
                    <td className="px-5 py-3">
                      <code className="text-[#58a6ff] text-xs font-mono bg-[#58a6ff]/10 px-2 py-0.5 rounded">{row.asin}</code>
                    </td>
                    <td className="px-5 py-3 text-white text-sm font-medium">{formatCurrency(row.sales)}</td>
                    <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(row.units)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
                          <div className="h-full bg-[#3fb950] rounded-full" style={{ width: `${Math.min(row.buyBox, 100)}%` }} />
                        </div>
                        <span className="text-[#3fb950] text-xs">{formatPercent(row.buyBox)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(row.pageViews)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">Activo</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#8b949e] text-sm">
                    Sin datos. Verificá que el Sheet esté compartido con la cuenta de servicio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
