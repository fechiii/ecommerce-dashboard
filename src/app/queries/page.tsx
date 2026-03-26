"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Database, RefreshCw, CheckCircle, Clock, XCircle, Filter } from "lucide-react";

interface QueryRow {
  runDate: string;
  region: string;
  marketplace: string;
  marketplaceId: string;
  reportType: string;
  granularity: string;
  dataStart: string;
  dataEnd: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  DONE:       { color: "text-[#3fb950]", bg: "bg-[#3fb950]/10",  border: "border-[#3fb950]/20", icon: CheckCircle },
  PROCESSING: { color: "text-[#f0b429]", bg: "bg-[#f0b429]/10",  border: "border-[#f0b429]/20", icon: Clock },
  ERROR:      { color: "text-[#f85149]", bg: "bg-[#f85149]/10",  border: "border-[#f85149]/20", icon: XCircle },
  PENDING:    { color: "text-[#8b949e]", bg: "bg-[#8b949e]/10",  border: "border-[#8b949e]/20", icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const key = status?.toUpperCase() in STATUS_CONFIG ? status.toUpperCase() : "PENDING";
  const cfg = STATUS_CONFIG[key];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon size={10} />
      {status || "—"}
    </span>
  );
}

export default function QueriesPage() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  async function fetchQueries() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets?tab=queries");
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      const json = await res.json();
      setRows((json.data || []).reverse()); // most recent first
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchQueries(); }, []);

  // Derive unique filter values
  const statuses = ["ALL", ...Array.from(new Set(rows.map((r) => r.status?.toUpperCase()).filter(Boolean)))];
  const regions  = ["ALL", ...Array.from(new Set(rows.map((r) => r.region).filter(Boolean)))];

  const filtered = rows.filter((r) => {
    const matchSearch = !search || [r.reportType, r.marketplace, r.region, r.status, r.dataStart, r.dataEnd]
      .some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || r.status?.toUpperCase() === statusFilter;
    const matchRegion = regionFilter === "ALL" || r.region === regionFilter;
    return matchSearch && matchStatus && matchRegion;
  });

  // Stats
  const stats = {
    total: rows.length,
    done: rows.filter((r) => r.status?.toUpperCase() === "DONE").length,
    errors: rows.filter((r) => r.status?.toUpperCase() === "ERROR").length,
    processing: rows.filter((r) => r.status?.toUpperCase() === "PROCESSING").length,
  };

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Queries Log" />
        <main className="flex-1 p-6 space-y-6">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-[#8b949e]" />
              <span className="text-[#8b949e] text-sm">
                {loading ? "Cargando..." : `${rows.length} registros totales`}
              </span>
            </div>
            <button onClick={fetchQueries} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total runs", value: stats.total, color: "text-white" },
              { label: "Completados", value: stats.done, color: "text-[#3fb950]" },
              { label: "En proceso", value: stats.processing, color: "text-[#f0b429]" },
              { label: "Con error", value: stats.errors, color: "text-[#f85149]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#161b22] border border-[#30363d] rounded-xl px-5 py-4">
                <p className="text-[#8b949e] text-xs mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">⚠️ {error}</div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-[#8b949e]" />
              <span className="text-[#8b949e] text-xs">Filtros:</span>
            </div>
            {/* Status */}
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1 flex-wrap">
              {statuses.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === s ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}>
                  {s === "ALL" ? "Todos" : s}
                </button>
              ))}
            </div>
            {/* Region */}
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1 flex-wrap">
              {regions.map((r) => (
                <button key={r} onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${regionFilter === r ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}>
                  {r}
                </button>
              ))}
            </div>
            {/* Search */}
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tipo, marketplace..."
              className="ml-auto bg-[#161b22] border border-[#30363d] text-white text-xs rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#8b949e]" />
          </div>

          {/* Table */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#30363d] text-xs text-[#8b949e]">
              Mostrando <span className="text-white font-medium">{filtered.length}</span> registros
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    {["Fecha", "Región", "Marketplace", "Tipo de Reporte", "Granularidad", "Data Inicio", "Data Fin", "Estado"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-medium text-[#8b949e] px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#30363d]/50">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-[#30363d] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-[#8b949e] text-sm">Sin resultados</td></tr>
                  ) : filtered.map((row, i) => (
                    <tr key={i} className={`hover:bg-[#0d1117]/50 transition-colors ${i < filtered.length - 1 ? "border-b border-[#30363d]/50" : ""}`}>
                      <td className="px-4 py-3 text-[#8b949e] text-xs font-mono whitespace-nowrap">{row.runDate || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-white text-xs font-medium">{row.region || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-[#8b949e] text-xs">{row.marketplace || "—"}</td>
                      <td className="px-4 py-3">
                        <code className="text-[#58a6ff] text-[11px] bg-[#58a6ff]/10 px-2 py-0.5 rounded font-mono">{row.reportType || "—"}</code>
                      </td>
                      <td className="px-4 py-3 text-[#8b949e] text-xs">{row.granularity || "—"}</td>
                      <td className="px-4 py-3 text-[#8b949e] text-xs font-mono whitespace-nowrap">{row.dataStart || "—"}</td>
                      <td className="px-4 py-3 text-[#8b949e] text-xs font-mono whitespace-nowrap">{row.dataEnd || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
