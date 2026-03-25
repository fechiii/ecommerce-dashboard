"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import SalesChart from "@/components/SalesChart";
import MetricsBarChart from "@/components/MetricsBarChart";
import { DollarSign, Package, Eye, ShoppingCart, TrendingUp, Activity } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

// Mock data for initial render (replaced by real API data)
const mockSalesData = [
  { date: "Feb 18", us: 42000, eu: 28000 },
  { date: "Feb 19", us: 38000, eu: 31000 },
  { date: "Feb 20", us: 51000, eu: 29000 },
  { date: "Feb 21", us: 47000, eu: 35000 },
  { date: "Feb 22", us: 62000, eu: 41000 },
  { date: "Feb 23", us: 58000, eu: 38000 },
  { date: "Feb 24", us: 71000, eu: 45000 },
  { date: "Feb 25", us: 68000, eu: 42000 },
];

const mockTopAsins = [
  { asin: "B0CZ7CMFFP", sales: 12840, units: 156, buyBox: 98.5, pageViews: 4821 },
  { asin: "B0FC3176WH", sales: 9320, units: 98, buyBox: 99.8, pageViews: 3102 },
  { asin: "B0CYQW3VQ1", sales: 7640, units: 74, buyBox: 96.7, pageViews: 2890 },
  { asin: "B0F6P2B75W", sales: 5210, units: 52, buyBox: 98.3, pageViews: 1980 },
  { asin: "B0FC3RD11D", sales: 3890, units: 38, buyBox: 100, pageViews: 1450 },
];

const mockMetrics = [
  { name: "Feb 20", sessions: 8200, pageViews: 11500 },
  { name: "Feb 21", sessions: 7800, pageViews: 10900 },
  { name: "Feb 22", sessions: 9400, pageViews: 13200 },
  { name: "Feb 23", sessions: 8900, pageViews: 12400 },
  { name: "Feb 24", sessions: 10200, pageViews: 14800 },
  { name: "Feb 25", sessions: 9800, pageViews: 13900 },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"amazon" | "meli">("amazon");

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Dashboard" />
        <main className="flex-1 p-6 space-y-6">

          {/* Platform tabs */}
          <div className="flex items-center justify-between">
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveTab("amazon")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "amazon" ? "bg-[#FF9900] text-black" : "text-[#8b949e] hover:text-white"}`}
              >
                Amazon
              </button>
              <button
                onClick={() => setActiveTab("meli")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "meli" ? "bg-[#FFE600] text-black" : "text-[#8b949e] hover:text-white"}`}
              >
                Mercado Libre
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <Activity size={12} className="text-[#3fb950]" />
              <span>Última sync: hace 2 horas</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Ventas Totales" value={formatCurrency(437820)} change={12.4} icon={DollarSign} iconColor="text-[#FF9900]" subtitle="Últimos 30 días" />
            <StatCard title="Unidades Vendidas" value={formatNumber(4821)} change={8.2} icon={Package} iconColor="text-[#58a6ff]" subtitle="Últimos 30 días" />
            <StatCard title="Page Views" value={formatNumber(98450)} change={-3.1} icon={Eye} iconColor="text-purple-400" subtitle="Últimos 30 días" />
            <StatCard title="Buy Box %" value={formatPercent(97.8)} change={1.2} icon={ShoppingCart} iconColor="text-[#3fb950]" subtitle="Promedio actual" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sales chart - 2/3 width */}
            <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm">Ventas por Marketplace</h3>
                  <p className="text-[#8b949e] text-xs mt-0.5">USA vs EU/UK — últimos 7 días</p>
                </div>
                <select className="bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-xs rounded-md px-2 py-1 focus:outline-none">
                  <option>Últimos 7 días</option>
                  <option>Últimos 30 días</option>
                  <option>Este mes</option>
                </select>
              </div>
              <SalesChart data={mockSalesData} />
            </div>

            {/* Sessions & Page Views - 1/3 */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="mb-4">
                <h3 className="text-white font-semibold text-sm">Tráfico</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">Sessions & Page Views</p>
              </div>
              <MetricsBarChart data={mockMetrics} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                  <p className="text-[#8b949e] text-[10px]">Avg Sessions</p>
                  <p className="text-white font-bold text-sm">9,383</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                  <p className="text-[#8b949e] text-[10px]">Conversión</p>
                  <p className="text-white font-bold text-sm">13.2%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top ASINs table */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
              <div>
                <h3 className="text-white font-semibold text-sm">Top ASINs</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">Mejores productos por ventas</p>
              </div>
              <button className="text-xs text-[#58a6ff] hover:underline">Ver todos →</button>
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
                  {mockTopAsins.map((row, i) => (
                    <tr key={row.asin} className={`border-b border-[#30363d]/50 hover:bg-[#0d1117]/50 transition-colors ${i === mockTopAsins.length - 1 ? "border-0" : ""}`}>
                      <td className="px-5 py-3">
                        <code className="text-[#58a6ff] text-xs font-mono bg-[#58a6ff]/10 px-2 py-0.5 rounded">{row.asin}</code>
                      </td>
                      <td className="px-5 py-3 text-white text-sm font-medium">{formatCurrency(row.sales)}</td>
                      <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(row.units)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
                            <div className="h-full bg-[#3fb950] rounded-full" style={{ width: `${row.buyBox}%` }} />
                          </div>
                          <span className="text-[#3fb950] text-xs">{formatPercent(row.buyBox)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(row.pageViews)}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">Activo</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platforms status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amazon */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#FF9900]/20 rounded-lg flex items-center justify-center">
                    <span className="text-[#FF9900] text-xs font-bold">A</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Amazon SP-API</p>
                    <p className="text-[#8b949e] text-[11px]">Amz API BOT · Amz Listings</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[#3fb950] text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse"></span>
                  Conectado
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <p className="text-[#8b949e] text-[10px]">Marketplaces</p>
                  <p className="text-white font-semibold text-sm mt-0.5">US · EU · UK</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <p className="text-[#8b949e] text-[10px]">Token expira</p>
                  <p className="text-white font-semibold text-sm mt-0.5">~5h 40min</p>
                </div>
              </div>
            </div>

            {/* Mercado Libre */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#FFE600]/20 rounded-lg flex items-center justify-center">
                    <span className="text-[#FFE600] text-xs font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Mercado Libre</p>
                    <p className="text-[#8b949e] text-[11px]">Seller Rocket · App 5427076205404931</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[#f0b429] text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429] animate-pulse"></span>
                  Pendiente
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <p className="text-[#8b949e] text-[10px]">Estado OAuth</p>
                  <p className="text-white font-semibold text-sm mt-0.5">Configurar</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <p className="text-[#8b949e] text-[10px]">App ID</p>
                  <p className="text-white font-semibold text-sm mt-0.5">54270762...</p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
