"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, DollarSign, MousePointer, Eye, Target, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { useClient } from "@/lib/ClientContext";
import { useDateRange } from "@/lib/DateContext";

interface Campaign { id: string; name: string; status: string; daily_budget: number }
interface MetricRow {
  date: string; campaign_id: string; campaign_name: string;
  item_id?: string; item_title?: string;
  impressions: number; clicks: number; spend: number;
  attributed_sales: number; orders: number;
  ctr: number; cpc: number; acos: number; roas: number;
}
interface AdsData {
  accountId: string;
  period: { from: string; to: string };
  totalImpressions: number; totalClicks: number; totalSpend: number;
  totalSales: number; totalOrders: number;
  avgCTR: number; avgACOS: number; avgROAS: number;
  campaigns: Campaign[];
  metricsTable: MetricRow[];
  byDate: { date: string; spend: number; sales: number; clicks: number; impressions: number }[];
  error?: string;
  message?: string;
}

type SortKey = "campaign_name" | "impressions" | "clicks" | "spend" | "attributed_sales" | "ctr" | "acos" | "roas";

const STATUS_COLORS: Record<string, string> = {
  active:   "text-[#3fb950] bg-[#3fb950]/10 border-[#3fb950]/20",
  paused:   "text-[#f0b429] bg-[#f0b429]/10 border-[#f0b429]/20",
  archived: "text-[#8b949e] bg-[#30363d]    border-[#30363d]",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs space-y-1">
      <p className="text-[#8b949e] mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#8b949e]">{p.name}:</span>
          <span className="text-white font-medium">
            {p.name === "Gasto" || p.name === "Ventas" ? formatCurrency(p.value, "ARS") : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MeliAdsPage() {
  const { client } = useClient();
  const { range } = useDateRange();
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCampaign, setActiveCampaign] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [chartMetric, setChartMetric] = useState<"spend_sales" | "clicks_impressions">("spend_sales");

  const accountId = client.meliAccount ?? "filhos";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meli/ads?account=${accountId}&from=${range.from}&to=${range.to}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [accountId, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtrar por campaña
  const tableRows = (data?.metricsTable ?? [])
    .filter((r) => activeCampaign === "all" || r.campaign_id === activeCampaign)
    .sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      return sortAsc ? va - vb : vb - va;
    });

  // Agregar por fecha filtrando campaña
  const chartData = (data?.byDate ?? []).map((d) => ({ ...d, date: d.date.slice(5) }));

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
      : <ChevronDown size={11} className="opacity-30" />;

  const notConfigured = data?.error === "not_configured";

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Publicidad MeLi" />
        <main className="flex-1 p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-white font-semibold text-sm">{client.label} — Anuncios de Mercado Libre</h2>
              <p className="text-[#8b949e] text-xs mt-0.5">{range.label}</p>
            </div>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Actualizar
            </button>
          </div>

          {/* Not configured banner */}
          {notConfigured && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-[#f0b429] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-white font-medium text-sm">Conexión con PAds pendiente</p>
                  <p className="text-[#8b949e] text-xs leading-relaxed">{data?.message}</p>
                </div>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-4 space-y-2 text-xs">
                <p className="text-[#8b949e] font-medium uppercase tracking-wider">Cómo obtener el Product ID:</p>
                {[
                  "1. Entrá a developers.mercadolibre.com con tu cuenta",
                  "2. Seleccioná la app \"Seller Rocket\" (5427076205404931)",
                  '3. En el menú → "Productos" → "Publicidad / Product Ads"',
                  "4. Copiá el Product ID asignado (ej: MLA123456)",
                  "5. Pasámelo y lo subo a Vercel en segundos",
                ].map((s) => (
                  <p key={s} className="text-[#c9d1d9]">{s}</p>
                ))}
              </div>
            </div>
          )}

          {/* Error genérico */}
          {data?.error && data.error !== "not_configured" && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={15} /> {data.error}
            </div>
          )}

          {/* Stats */}
          {!notConfigured && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                <StatCard title="Impresiones"  value={loading ? "—" : formatNumber(data?.totalImpressions ?? 0)}       change={0} icon={Eye}          iconColor="text-[#58a6ff]"  subtitle="total período" loading={loading} />
                <StatCard title="Clicks"       value={loading ? "—" : formatNumber(data?.totalClicks ?? 0)}            change={0} icon={MousePointer} iconColor="text-purple-400" subtitle="total período" loading={loading} />
                <StatCard title="CTR"          value={loading ? "—" : `${(data?.avgCTR ?? 0).toFixed(2)}%`}            change={0} icon={Target}       iconColor="text-[#3fb950]"  subtitle="promedio" loading={loading} />
                <StatCard title="Gasto"        value={loading ? "—" : formatCurrency(data?.totalSpend ?? 0, "ARS")}    change={0} icon={DollarSign}   iconColor="text-red-400"    subtitle="en publicidad" loading={loading} />
                <StatCard title="Ventas"       value={loading ? "—" : formatCurrency(data?.totalSales ?? 0, "ARS")}    change={0} icon={TrendingUp}   iconColor="text-[#FFE600]"  subtitle="atribuidas" loading={loading} />
                <StatCard title="Órdenes"      value={loading ? "—" : formatNumber(data?.totalOrders ?? 0)}            change={0} icon={Target}       iconColor="text-[#3fb950]"  subtitle="atribuidas" loading={loading} />
                <StatCard title="ACOS"         value={loading ? "—" : `${(data?.avgACOS ?? 0).toFixed(1)}%`}           change={0} icon={Target}       iconColor="text-[#f0b429]"  subtitle="gasto/ventas" loading={loading} />
                <StatCard title="ROAS"         value={loading ? "—" : `${(data?.avgROAS ?? 0).toFixed(2)}x`}           change={0} icon={TrendingUp}   iconColor="text-[#3fb950]"  subtitle="retorno" loading={loading} />
              </div>

              {/* Chart + Campaigns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Trend chart */}
                <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Evolución</h3>
                      <p className="text-[#8b949e] text-xs mt-0.5">{range.label}</p>
                    </div>
                    <div className="flex bg-[#0d1117] border border-[#30363d] rounded-lg p-0.5 gap-0.5">
                      {(["spend_sales", "clicks_impressions"] as const).map((m) => (
                        <button key={m} onClick={() => setChartMetric(m)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${chartMetric === m ? "bg-[#30363d] text-white" : "text-[#8b949e] hover:text-white"}`}>
                          {m === "spend_sales" ? "Gasto / Ventas" : "Clicks / Impresiones"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {loading ? (
                    <div className="h-48 flex items-center justify-center text-[#8b949e] text-sm">Cargando...</div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f85149" stopOpacity={0.3} /><stop offset="95%" stopColor="#f85149" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFE600" stopOpacity={0.3} /><stop offset="95%" stopColor="#FFE600" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a371f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a371f7" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: "11px", color: "#8b949e" }} />
                        {chartMetric === "spend_sales" ? (
                          <>
                            <Area type="monotone" dataKey="spend" name="Gasto"  stroke="#f85149" fill="url(#gSpend)" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="sales" name="Ventas" stroke="#FFE600" fill="url(#gSales)" strokeWidth={2} dot={false} />
                          </>
                        ) : (
                          <>
                            <Area type="monotone" dataKey="clicks"      name="Clicks"       stroke="#a371f7" fill="url(#gClicks)" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="impressions" name="Impresiones"  stroke="#58a6ff" fill="url(#gImpr)"   strokeWidth={2} dot={false} />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-[#8b949e] text-sm">Sin datos de publicidad</div>
                  )}
                </div>

                {/* Campaigns list */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-3">Campañas</h3>
                  {loading ? (
                    <div className="h-32 flex items-center justify-center text-[#8b949e] text-sm">Cargando...</div>
                  ) : (data?.campaigns ?? []).length === 0 ? (
                    <p className="text-[#8b949e] text-sm text-center py-8">Sin campañas</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Filtro "Todas" */}
                      <button
                        onClick={() => setActiveCampaign("all")}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${activeCampaign === "all" ? "bg-[#FFE600]/10 border border-[#FFE600]/30 text-[#FFE600]" : "bg-[#0d1117] text-[#8b949e] hover:text-white"}`}
                      >
                        <span className="font-medium">Todas las campañas</span>
                      </button>
                      {(data?.campaigns ?? []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCampaign(c.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${activeCampaign === c.id ? "bg-[#FFE600]/10 border border-[#FFE600]/30" : "bg-[#0d1117] hover:bg-[#30363d]/30"}`}
                        >
                          <div className="text-left min-w-0">
                            <p className={`font-medium truncate ${activeCampaign === c.id ? "text-[#FFE600]" : "text-white"}`}>{c.name}</p>
                            <p className="text-[#8b949e] mt-0.5">Presup: {formatCurrency(c.daily_budget, "ARS")}/día</p>
                          </div>
                          <span className={`flex-shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.archived}`}>
                            {c.status === "active" ? "Activa" : c.status === "paused" ? "Pausa" : "Arch."}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics table */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">Métricas por Anuncio</h3>
                    <p className="text-[#8b949e] text-xs mt-0.5">
                      {activeCampaign === "all" ? "Todas las campañas" : (data?.campaigns.find((c) => c.id === activeCampaign)?.name ?? activeCampaign)}
                      {" · "}{tableRows.length} filas
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#30363d]">
                        {([
                          ["Fecha", "date"],
                          ["Campaña", "campaign_name"],
                          ["Item", null],
                          ["Impresiones", "impressions"],
                          ["Clicks", "clicks"],
                          ["CTR", "ctr"],
                          ["Gasto", "spend"],
                          ["Ventas", "attributed_sales"],
                          ["ACOS", "acos"],
                          ["ROAS", "roas"],
                        ] as [string, SortKey | null][]).map(([label, key]) => (
                          <th key={label}
                            onClick={() => key && handleSort(key)}
                            className={`text-left font-medium text-[#8b949e] px-4 py-3 uppercase tracking-wider whitespace-nowrap ${key ? "cursor-pointer hover:text-white select-none" : ""}`}
                          >
                            <div className="flex items-center gap-1">
                              {label}
                              {key && <SortIcon k={key} />}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-[#8b949e]">Cargando métricas...</td></tr>
                      ) : tableRows.length === 0 ? (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-[#8b949e]">Sin datos en el período</td></tr>
                      ) : (
                        tableRows.slice(0, 100).map((row, i) => (
                          <tr key={`${row.date}-${row.campaign_id}-${i}`}
                            className="border-b border-[#30363d]/50 hover:bg-[#0d1117]/50 transition-colors">
                            <td className="px-4 py-2.5 text-[#8b949e] whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-2.5 max-w-[160px]">
                              <span className="text-white truncate block">{row.campaign_name}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              {row.item_id ? (
                                <code className="text-[#FFE600] text-[10px] bg-[#FFE600]/10 px-1.5 py-0.5 rounded">{row.item_id}</code>
                              ) : <span className="text-[#8b949e]">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-white text-right">{formatNumber(row.impressions)}</td>
                            <td className="px-4 py-2.5 text-white text-right">{formatNumber(row.clicks)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={row.ctr > 1 ? "text-[#3fb950]" : "text-[#8b949e]"}>{row.ctr.toFixed(2)}%</span>
                            </td>
                            <td className="px-4 py-2.5 text-red-400 text-right font-medium">{formatCurrency(row.spend, "ARS")}</td>
                            <td className="px-4 py-2.5 text-[#FFE600] text-right font-medium">{formatCurrency(row.attributed_sales, "ARS")}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={row.acos < 20 ? "text-[#3fb950]" : row.acos < 40 ? "text-[#f0b429]" : "text-red-400"}>
                                {row.acos.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={row.roas > 4 ? "text-[#3fb950]" : row.roas > 2 ? "text-[#f0b429]" : "text-red-400"}>
                                {row.roas.toFixed(2)}x
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
