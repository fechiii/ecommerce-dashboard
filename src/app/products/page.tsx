"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Package, RefreshCw, ArrowUpDown, Download, TrendingUp } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

interface Product {
  asin: string;
  parentAsin: string;
  activeIn: string[];
  totalSales: number;
  totalUnits: number;
  usSales: number;
  euSales: number;
  usUnits: number;
  euUnits: number;
  avgBuyBox: number;
  usBuyBox: number;
  euBuyBox: number;
  totalPageViews: number;
  totalSessions: number;
  convRate: number;
  firstSeen: string;
  lastSeen: string;
}

type SortKey = "totalSales" | "totalUnits" | "usSales" | "euSales" | "avgBuyBox" | "totalPageViews" | "convRate";

function BuyBoxBar({ value }: { value: number }) {
  const color = value >= 95 ? "#3fb950" : value >= 80 ? "#f0b429" : value > 0 ? "#f85149" : "#30363d";
  const textColor = value >= 95 ? "text-[#3fb950]" : value >= 80 ? "text-[#f0b429]" : value > 0 ? "text-[#f85149]" : "text-[#8b949e]";
  return value > 0 ? (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className={`text-xs ${textColor}`}>{formatPercent(value)}</span>
    </div>
  ) : <span className="text-[#8b949e] text-xs">—</span>;
}

function MarketplacePill({ mkt }: { mkt: string }) {
  const isUS = mkt === "US";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isUS ? "bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20" : "bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20"}`}>
      {mkt}
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [mktFilter, setMktFilter] = useState<"ALL" | "US" | "EU">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("totalSales");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedAsin, setExpandedAsin] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      const json = await res.json();
      setProducts(json.products || []);
      setTotal(json.total || 0);
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = products
    .filter((p) => {
      const matchSearch = !search || p.asin.toLowerCase().includes(search.toLowerCase()) || p.parentAsin.toLowerCase().includes(search.toLowerCase());
      const matchMkt = mktFilter === "ALL" || p.activeIn.includes(mktFilter);
      return matchSearch && matchMkt;
    })
    .sort((a, b) => sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalRevenue = filtered.reduce((s, p) => s + p.totalSales, 0);
  const totalUnits = filtered.reduce((s, p) => s + p.totalUnits, 0);
  const multiMkt = filtered.filter((p) => p.activeIn.length > 1).length;

  const exportCSV = () => {
    const rows = [
      ["ASIN", "Parent ASIN", "Marketplaces", "Ventas Total", "Ventas US", "Ventas EU", "Unidades", "Buy Box Avg", "Buy Box US", "Buy Box EU", "Page Views", "Sessions", "Conv %", "Primer dato", "Último dato"],
      ...filtered.map((p) => [p.asin, p.parentAsin, p.activeIn.join("+"), p.totalSales, p.usSales, p.euSales, p.totalUnits, p.avgBuyBox, p.usBuyBox, p.euBuyBox, p.totalPageViews, p.totalSessions, p.convRate, p.firstSeen, p.lastSeen]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "productos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <ArrowUpDown size={10} className={`inline ml-1 ${sortKey === k ? "text-[#58a6ff]" : "text-[#30363d]"}`} />
  );

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Productos" />
        <main className="flex-1 p-6 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "ASINs únicos", value: total.toString(), icon: Package, color: "text-[#58a6ff]" },
              { label: "Revenue total", value: loading ? "—" : formatCurrency(totalRevenue), icon: TrendingUp, color: "text-[#FF9900]" },
              { label: "Unidades totales", value: loading ? "—" : formatNumber(totalUnits), icon: Package, color: "text-[#3fb950]" },
              { label: "Multi-marketplace", value: loading ? "—" : multiMkt.toString(), icon: TrendingUp, color: "text-purple-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
                <div className={`${color} mb-3`}><Icon size={18} /></div>
                <p className="text-[#8b949e] text-xs mb-1">{label}</p>
                <p className="text-white text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">⚠️ {error}</div>
          )}

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
              {(["ALL", "US", "EU"] as const).map((m) => (
                <button key={m} onClick={() => { setMktFilter(m); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mktFilter === m ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}>
                  {m === "ALL" ? "Todos" : m === "US" ? "🇺🇸 USA" : "🇪🇺 EU/UK"}
                </button>
              ))}
            </div>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar ASIN..."
              className="bg-[#161b22] border border-[#30363d] text-white text-xs rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#8b949e]" />
            <div className="ml-auto flex gap-2">
              <button onClick={fetchProducts} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
              <button onClick={exportCSV} disabled={!products.length || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
                <Download size={11} /> CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#30363d] text-xs text-[#8b949e]">
              <span className="text-white font-medium">{filtered.length}</span> productos · página {page}/{totalPages || 1}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    {[
                      { label: "ASIN",       key: null },
                      { label: "Mercados",   key: null },
                      { label: "Ventas",     key: "totalSales" as SortKey },
                      { label: "US $",       key: "usSales" as SortKey },
                      { label: "EU $",       key: "euSales" as SortKey },
                      { label: "Unidades",   key: "totalUnits" as SortKey },
                      { label: "Buy Box",    key: "avgBuyBox" as SortKey },
                      { label: "BB US/EU",   key: null },
                      { label: "Page Views", key: "totalPageViews" as SortKey },
                      { label: "Conv %",     key: "convRate" as SortKey },
                      { label: "Vigencia",   key: null },
                    ].map(({ label, key }) => (
                      <th key={label} onClick={() => key && toggleSort(key)}
                        className={`text-left text-[11px] font-medium text-[#8b949e] px-4 py-3 uppercase tracking-wider whitespace-nowrap ${key ? "cursor-pointer hover:text-white select-none" : ""}`}>
                        {label}{key && <SortIcon k={key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#30363d]/50">
                        {Array.from({ length: 11 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-[#30363d] rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : pageRows.length === 0 ? (
                    <tr><td colSpan={11} className="px-5 py-10 text-center text-[#8b949e] text-sm">Sin resultados</td></tr>
                  ) : pageRows.map((p, i) => {
                    const isExpanded = expandedAsin === p.asin;
                    return (
                      <>
                        <tr key={p.asin}
                          onClick={() => setExpandedAsin(isExpanded ? null : p.asin)}
                          className={`cursor-pointer hover:bg-[#0d1117]/60 transition-colors ${i < pageRows.length - 1 || isExpanded ? "border-b border-[#30363d]/50" : ""}`}>
                          <td className="px-4 py-3">
                            <code className="text-[#58a6ff] text-xs font-mono bg-[#58a6ff]/10 px-2 py-0.5 rounded">{p.asin}</code>
                            {p.parentAsin && p.parentAsin !== p.asin && (
                              <p className="text-[#8b949e] text-[10px] mt-0.5 font-mono">{p.parentAsin}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {p.activeIn.map((m) => <MarketplacePill key={m} mkt={m} />)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white font-semibold text-sm">{formatCurrency(p.totalSales)}</td>
                          <td className="px-4 py-3 text-[#8b949e] text-xs">{p.usSales > 0 ? formatCurrency(p.usSales) : "—"}</td>
                          <td className="px-4 py-3 text-[#8b949e] text-xs">{p.euSales > 0 ? formatCurrency(p.euSales) : "—"}</td>
                          <td className="px-4 py-3 text-[#8b949e] text-sm">{formatNumber(p.totalUnits)}</td>
                          <td className="px-4 py-3"><BuyBoxBar value={p.avgBuyBox} /></td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {p.usBuyBox > 0 && <div className="flex items-center gap-1 text-[10px] text-[#8b949e]"><span className="text-[#FF9900]">US</span> {formatPercent(p.usBuyBox)}</div>}
                              {p.euBuyBox > 0 && <div className="flex items-center gap-1 text-[10px] text-[#8b949e]"><span className="text-[#58a6ff]">EU</span> {formatPercent(p.euBuyBox)}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#8b949e] text-sm">{formatNumber(p.totalPageViews)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium ${p.convRate >= 10 ? "text-[#3fb950]" : p.convRate >= 5 ? "text-[#f0b429]" : "text-[#8b949e]"}`}>
                              {p.convRate > 0 ? `${p.convRate}%` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8b949e] text-[10px] font-mono whitespace-nowrap">
                            {p.firstSeen && <div>{p.firstSeen}</div>}
                            {p.lastSeen && p.lastSeen !== p.firstSeen && <div>{p.lastSeen}</div>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${p.asin}-exp`} className="border-b border-[#30363d]/50 bg-[#0d1117]/40">
                            <td colSpan={11} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div><p className="text-[#8b949e] mb-1">Unidades US</p><p className="text-white font-semibold">{formatNumber(p.usUnits)}</p></div>
                                <div><p className="text-[#8b949e] mb-1">Unidades EU</p><p className="text-white font-semibold">{formatNumber(p.euUnits)}</p></div>
                                <div><p className="text-[#8b949e] mb-1">Sessions</p><p className="text-white font-semibold">{formatNumber(p.totalSessions)}</p></div>
                                <div><p className="text-[#8b949e] mb-1">Tasa de conv.</p><p className="text-white font-semibold">{p.convRate > 0 ? `${p.convRate}%` : "—"}</p></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
