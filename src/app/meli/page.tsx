"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Package, ShoppingCart, MessageCircle, RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useClient } from "@/lib/ClientContext";
import { useDateRange } from "@/lib/DateContext";

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

interface MeliData {
  period: { from: string; to: string };
  accounts: AccountMetrics[];
}

const ACCOUNT_LABELS: Record<string, string> = {
  filhos: "FILHOS",
  ugo: "UGO",
};

const ACCOUNT_COLORS: Record<string, string> = {
  filhos: "#FFE600",
  ugo:    "#00BFFF",
};

const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs">
      <p className="text-[#8b949e] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white">{p.name}: {formatCurrency(p.value, "ARS")}</span>
        </div>
      ))}
    </div>
  );
};

function dateRange(days: number) {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  return { from, to };
}

export default function MeliPage() {
  const { client } = useClient();
  const { range } = useDateRange();
  const [data, setData] = useState<MeliData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeAccount = client.meliAccount ?? "all";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meli?account=${activeAccount}&from=${range.from}&to=${range.to}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Error al cargar datos de Meli");
      }
      const json = await res.json();
      // Normalizar: si vino un solo account (no "all") lo envolvemos igual
      if (json.accountId) {
        setData({ period: { from: json.period?.from ?? "", to: json.period?.to ?? "" }, accounts: [json] });
      } else {
        setData(json);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [range, activeAccount]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleAccounts = data?.accounts ?? [];

  const hasError = (a: AccountMetrics) => !!a.error;

  // Totales combinados
  const totals = visibleAccounts.reduce(
    (acc, a) => ({
      sales:    acc.sales    + (a.totalSales   ?? 0),
      orders:   acc.orders   + (a.totalOrders  ?? 0),
      units:    acc.units    + (a.totalUnits   ?? 0),
      canceled: acc.canceled + (a.canceledOrders ?? 0),
      questions:acc.questions + (a.pendingQuestions ?? 0),
    }),
    { sales: 0, orders: 0, units: 0, canceled: 0, questions: 0 }
  );

  // Combinar salesByDate de todas las cuentas visibles
  const chartDataMap: Record<string, Record<string, number>> = {};
  visibleAccounts.forEach((a) => {
    if (a.error) return;
    (a.salesByDate ?? []).forEach(({ date, sales }) => {
      if (!chartDataMap[date]) chartDataMap[date] = {};
      chartDataMap[date][a.accountId] = (chartDataMap[date][a.accountId] ?? 0) + sales;
    });
  });
  const chartData = Object.entries(chartDataMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date: date.slice(5), ...vals }));

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Mercado Libre" />
        <main className="flex-1 p-6 space-y-6">

          {/* Header controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-white font-semibold text-sm">
                {client.meliAccount ? ACCOUNT_LABELS[client.meliAccount] ?? client.label : "Todas las cuentas"}
              </h2>
              <p className="text-[#8b949e] text-xs mt-0.5">Últimos {days} días</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Period selector */}
              <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      days === d ? "bg-[#30363d] text-white" : "text-[#8b949e] hover:text-white"
                    }`}
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

          {/* Error banner */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Account error cards */}
          {visibleAccounts.filter(hasError).map((a) => (
            <div key={a.accountId} className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl px-5 py-3 text-yellow-400 text-sm flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="font-medium">{ACCOUNT_LABELS[a.accountId] ?? a.accountId}:</span> {a.error}
            </div>
          ))}

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Ventas Totales"    value={loading ? "—" : formatCurrency(totals.sales, "ARS")} change={0} icon={DollarSign}       iconColor="text-[#FFE600]" subtitle={`últimos ${days} días`} loading={loading} />
            <StatCard title="Órdenes Pagadas"   value={loading ? "—" : formatNumber(totals.orders)}         change={0} icon={ShoppingCart}      iconColor="text-[#3fb950]" subtitle="estado: paid"          loading={loading} />
            <StatCard title="Unidades Vendidas" value={loading ? "—" : formatNumber(totals.units)}          change={0} icon={Package}           iconColor="text-[#58a6ff]" subtitle="ítems despachados"      loading={loading} />
            <StatCard title="Órdenes Canceladas"value={loading ? "—" : formatNumber(totals.canceled)}       change={0} icon={TrendingUp}        iconColor="text-red-400"   subtitle="en el período"         loading={loading} />
            <StatCard title="Preguntas Pendientes" value={loading ? "—" : formatNumber(totals.questions)}   change={0} icon={MessageCircle}     iconColor="text-purple-400" subtitle="sin responder"        loading={loading} />
          </div>

          {/* Sales chart */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-white font-semibold text-sm">Ventas por Fecha</h3>
              <p className="text-[#8b949e] text-xs mt-0.5">
                {data ? `${data.period.from} → ${data.period.to}` : "Cargando..."}
              </p>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center text-[#8b949e] text-sm">Cargando datos...</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {visibleAccounts.filter((a) => !a.error).map((a) => (
                      <linearGradient key={a.accountId} id={`grad_${a.accountId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={ACCOUNT_COLORS[a.accountId] ?? "#fff"} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ACCOUNT_COLORS[a.accountId] ?? "#fff"} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  {visibleAccounts.filter((a) => !a.error).map((a) => (
                    <Area
                      key={a.accountId}
                      type="monotone"
                      dataKey={a.accountId}
                      name={ACCOUNT_LABELS[a.accountId] ?? a.accountId}
                      stroke={ACCOUNT_COLORS[a.accountId] ?? "#fff"}
                      fill={`url(#grad_${a.accountId})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-[#8b949e] text-sm">Sin datos de ventas en el período</div>
            )}
          </div>

          {/* Per-account top items */}
          {visibleAccounts.filter((a) => !a.error && (a.topItems?.length ?? 0) > 0).map((account) => (
            <div key={account.accountId} className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#30363d] flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: ACCOUNT_COLORS[account.accountId] ?? "#fff" }}
                />
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    {ACCOUNT_LABELS[account.accountId] ?? account.accountId} — Top Productos
                  </h3>
                  <p className="text-[#8b949e] text-xs mt-0.5">
                    {account.totalOrders} órdenes · {formatCurrency(account.totalSales, account.currency)} ventas
                  </p>
                </div>
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
                    {loading ? (
                      <tr><td colSpan={4} className="px-5 py-6 text-center text-[#8b949e] text-sm">Cargando...</td></tr>
                    ) : (
                      account.topItems.map((item, i) => (
                        <tr key={item.id} className={`border-b border-[#30363d]/50 hover:bg-[#0d1117]/50 transition-colors ${i === account.topItems.length - 1 ? "border-0" : ""}`}>
                          <td className="px-5 py-3">
                            <code className="text-[#FFE600] text-xs font-mono bg-[#FFE600]/10 px-2 py-0.5 rounded">{item.id}</code>
                          </td>
                          <td className="px-5 py-3 text-white text-sm max-w-xs truncate">{item.title}</td>
                          <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(item.units)}</td>
                          <td className="px-5 py-3 text-white text-sm font-medium">{formatCurrency(item.sales, account.currency)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* UGO pending token warning */}
          {!loading && !data?.accounts.find((a) => a.accountId === "ugo") && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#00BFFF] font-bold">U</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">UGO — Pendiente de autorización</p>
                <p className="text-[#8b949e] text-xs mt-1">
                  Necesitamos el refresh token de la cuenta UGO (seller ID 3119303942) para mostrar sus datos.
                  Revisá el Apps Script correspondiente o re-autorizá la app Seller Rocket con esa cuenta.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
