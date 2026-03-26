"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import SalesChart from "@/components/SalesChart";
import { DollarSign, Package, ShoppingCart, Eye, TrendingUp, TrendingDown, ArrowUpDown, RefreshCw, Download } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
interface Totals {
  sales: number; units: number; orders: number; pageViews: number;
  sessions: number; avgBuyBox: number; salesChange: number; convRate: number;
}
interface ChartRow { date: string; us: number; eu: number; total: number; units: number; sessions: number; pageViews: number }
interface AsinRow {
  asin: string; parentAsin: string; marketplace: string;
  sales: number; units: number; orders: number; buyBox: number;
  pageViews: number; sessions: number; convRate: number;
}
interface SalesData { totals: Totals; chartData: ChartRow[]; asinTable: AsinRow[]; meta: { rows: number; days: number; marketplace: string } }

type SortKey = keyof Pick<AsinRow, "sales" | "units" | "orders" | "buyBox" | "pageViews" | "sessions" | "convRate">;
type SortDir = "asc" | "desc";

// ── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, iconColor, change }: {
  title: string; value: string; sub?: string; icon: React.ElementType; iconColor: string; change?: number;
}) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-[#0d1117] ${iconColor}`}>
          <Icon size={18} />
        </div>
        {change !== undefined && change !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${change >= 0 ? "bg-[#3fb950]/10 text-[#3fb950]" : "bg-[#f85149]/10 text-[#f85149]"}`}>
            {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-[#8b949e] text-xs mb-1">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-[#8b949e] text-xs mt-1">{sub}</p>}
    </div>
  );
}

const BAR_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs">
      <p className="text-[#8b949e] mb-1">{label}</p>
      <p className="text-white">{formatNumber(payload[0].value)} unidades</p>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [marketplace, setMarketplace] = useState<"all" | "us" | "eu">("all");
  const [days, setDays] = useState<7 | 14 | 30 | 60 | 90 | 0>(30);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartType, setChartType] = useState<"sales" | "units">("sales");

  // Table
  const [sortKey, setSortKey] = useState<SortKey>("sales");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ marketplace });
      if (dateFrom && dateTo) {
        params.set("from", dateFrom);
        params.set("to", dateTo);
      } else if (dateFrom) {
        params.set("from", dateFrom);
      } else if (dateTo) {
        params.set("to", dateTo);
      } else {
        params.set("days", String(days || 30));
      }
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setData(await res.json());
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [marketplace, days, dateFrom, dateTo]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  // Sort & filter table
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filteredRows = (data?.asinTable ?? [])
    .filter((r) => r.asin.toLowerCase().includes(search.toLowerCase()) || r.parentAsin.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["ASIN", "Parent ASIN", "Marketplace", "Ventas", "Unidades", "Órdenes", "Buy Box %", "Page Views", "Sessions", "Conv %"],
      ...filteredRows.map((r) => [r.asin, r.parentAsin, r.marketplace, r.sales, r.units, r.orders, r.buyBox, r.pageViews, r.sessions, r.convRate]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ventas_${marketplace}_${days}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data: switch between sales and units
  const chartData = (data?.chartData ?? []).map((r) => ({
    date: r.date,
    us: chartType === "sales" ? r.us : Math.round((r.units * (r.us / (r.us + r.eu + 0.001)))),
    eu: chartType === "sales" ? r.eu : Math.round((r.units * (r.eu / (r.us + r.eu + 0.001)))),
  }));

  const SortIcon = ({ k }: { k: SortKey }) => (
    <ArrowUpDown size={11} className={`inline ml-1 ${sortKey === k ? "text-[#58a6ff]" : "text-[#30363d]"}`} />
  );

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Ventas" />
        <main className="flex-1 p-6 space-y-6">

          {/* ── Filter bar ── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Marketplace */}
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
              {(["all", "us", "eu"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketplace(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${marketplace === m ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}
                >
                  {m === "all" ? "Todos" : m === "us" ? "🇺🇸 USA" : "🇪🇺 EU/UK"}
                </button>
              ))}
            </div>

            {/* Days — hidden when custom dates are set */}
            {!dateFrom && !dateTo && (
              <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
                {([7, 14, 30, 60, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${days === d ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            )}

            {/* Custom date range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#8b949e] text-xs">Desde</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58a6ff] [color-scheme:dark]"
              />
              <span className="text-[#8b949e] text-xs">Hasta</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58a6ff] [color-scheme:dark]"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="text-[#8b949e] hover:text-[#f85149] text-xs px-1.5 py-1 rounded transition-all"
                  title="Limpiar fechas"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {data && !loading && (
                <span className="text-xs text-[#8b949e]">{data.meta.rows.toLocaleString()} filas</span>
              )}
              <button onClick={fetchSales} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
              <button onClick={exportCSV} disabled={!data || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
                <Download size={11} />
                CSV
              </button>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">⚠️ {error}</div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Ventas Totales" value={loading ? "—" : formatCurrency(data?.totals.sales ?? 0)}
              icon={DollarSign} iconColor="text-[#FF9900]"
              sub={`Últimos ${days} días`} change={data?.totals.salesChange} />
            <KpiCard title="Unidades" value={loading ? "—" : formatNumber(data?.totals.units ?? 0)}
              icon={Package} iconColor="text-[#58a6ff]"
              sub={`${formatNumber(data?.totals.orders ?? 0)} órdenes`} />
            <KpiCard title="Buy Box Promedio" value={loading ? "—" : formatPercent(data?.totals.avgBuyBox ?? 0)}
              icon={ShoppingCart} iconColor="text-[#3fb950]"
              sub="Marketplace activo" />
            <KpiCard title="Page Views" value={loading ? "—" : formatNumber(data?.totals.pageViews ?? 0)}
              icon={Eye} iconColor="text-purple-400"
              sub={`Conv: ${data?.totals.convRate ?? 0}%`} />
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Sales / trend chart 2/3 */}
            <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm">Tendencia de Ventas</h3>
                  <p className="text-[#8b949e] text-xs mt-0.5">
                    {marketplace === "all" ? "USA vs EU/UK" : marketplace === "us" ? "USA" : "EU/UK"} —{" "}
                    {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `desde ${dateFrom}` : dateTo ? `hasta ${dateTo}` : `últimos ${days} días`}
                  </p>
                </div>
                <div className="flex bg-[#0d1117] border border-[#30363d] rounded-md p-0.5 gap-0.5">
                  <button onClick={() => setChartType("sales")}
                    className={`px-2.5 py-1 rounded text-xs transition-all ${chartType === "sales" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}>
                    $ Ventas
                  </button>
                  <button onClick={() => setChartType("units")}
                    className={`px-2.5 py-1 rounded text-xs transition-all ${chartType === "units" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}>
                    Unidades
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="h-52 flex items-center justify-center text-[#8b949e] text-sm">Cargando...</div>
              ) : chartData.length > 0 ? (
                <SalesChart data={chartData} />
              ) : (
                <div className="h-52 flex items-center justify-center text-[#8b949e] text-sm">Sin datos</div>
              )}
            </div>

            {/* Units by day bar 1/3 */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="mb-4">
                <h3 className="text-white font-semibold text-sm">Unidades / día</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">Volumen diario de unidades</p>
              </div>
              {loading ? (
                <div className="h-52 flex items-center justify-center text-[#8b949e] text-sm">Cargando...</div>
              ) : (data?.chartData ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={208}>
                  <BarChart data={(data?.chartData ?? []).slice(-14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BAR_TOOLTIP />} />
                    <Bar dataKey="units" fill="#58a6ff" radius={[2, 2, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-[#8b949e] text-sm">Sin datos</div>
              )}
            </div>
          </div>

          {/* ── ASIN Table ── */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
              <div>
                <h3 className="text-white font-semibold text-sm">Ventas por ASIN</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">
                  {filteredRows.length} ASINs · mostrando {Math.min(PAGE_SIZE, pageRows.length)} de {filteredRows.length}
                </p>
              </div>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar ASIN..."
                className="bg-[#0d1117] border border-[#30363d] text-white text-xs rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#8b949e]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    {[
                      { label: "ASIN", key: null },
                      { label: "MKT", key: null },
                      { label: "Ventas", key: "sales" as SortKey },
                      { label: "Unidades", key: "units" as SortKey },
                      { label: "Órdenes", key: "orders" as SortKey },
                      { label: "Buy Box %", key: "buyBox" as SortKey },
                      { label: "Page Views", key: "pageViews" as SortKey },
                      { label: "Sessions", key: "sessions" as SortKey },
                      { label: "Conv %", key: "convRate" as SortKey },
                    ].map(({ label, key }) => (
                      <th
                        key={label}
                        onClick={() => key && toggleSort(key)}
                        className={`text-left text-[11px] font-medium text-[#8b949e] px-4 py-3 uppercase tracking-wider ${key ? "cursor-pointer hover:text-white select-none" : ""}`}
                      >
                        {label}{key && <SortIcon k={key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-[#8b949e] text-sm">Cargando datos...</td></tr>
                  ) : pageRows.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-[#8b949e] text-sm">Sin resultados</td></tr>
                  ) : pageRows.map((row, i) => (
                    <tr key={`${row.asin}-${row.marketplace}`}
                      className={`hover:bg-[#0d1117]/50 transition-colors ${i < pageRows.length - 1 ? "border-b border-[#30363d]/50" : ""}`}>
                      <td className="px-4 py-3">
                        <code className="text-[#58a6ff] text-xs font-mono bg-[#58a6ff]/10 px-2 py-0.5 rounded">{row.asin}</code>
                        {row.parentAsin && row.parentAsin !== row.asin && (
                          <p className="text-[#8b949e] text-[10px] mt-0.5 font-mono">{row.parentAsin}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${row.marketplace === "US" ? "bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20" : "bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20"}`}>
                          {row.marketplace}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white text-sm font-semibold">{formatCurrency(row.sales)}</td>
                      <td className="px-4 py-3 text-[#8b949e] text-sm">{formatNumber(row.units)}</td>
                      <td className="px-4 py-3 text-[#8b949e] text-sm">{formatNumber(row.orders)}</td>
                      <td className="px-4 py-3">
                        {row.buyBox > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${Math.min(row.buyBox, 100)}%`, background: row.buyBox >= 95 ? "#3fb950" : row.buyBox >= 80 ? "#f0b429" : "#f85149" }} />
                            </div>
                            <span className={`text-xs ${row.buyBox >= 95 ? "text-[#3fb950]" : row.buyBox >= 80 ? "text-[#f0b429]" : "text-[#f85149]"}`}>
                              {formatPercent(row.buyBox)}
                            </span>
                          </div>
                        ) : <span className="text-[#8b949e] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#8b949e] text-sm">{formatNumber(row.pageViews)}</td>
                      <td className="px-4 py-3 text-[#8b949e] text-sm">{formatNumber(row.sessions)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${row.convRate >= 10 ? "text-[#3fb950]" : row.convRate >= 5 ? "text-[#f0b429]" : "text-[#8b949e]"}`}>
                          {row.convRate > 0 ? `${row.convRate}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#30363d]">
                <span className="text-xs text-[#8b949e]">Página {page} de {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-xs hover:text-white disabled:opacity-40 transition-all">
                    ← Anterior
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-xs hover:text-white disabled:opacity-40 transition-all">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
