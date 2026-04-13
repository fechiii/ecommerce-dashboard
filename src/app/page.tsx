"use client";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import AmazonDashboard from "@/components/dashboard/AmazonDashboard";
import MeliDashboard from "@/components/dashboard/MeliDashboard";
import { useClient } from "@/lib/ClientContext";
import { useState } from "react";

export default function Home() {
  const { client } = useClient();

  const hasMeli   = !!client.meliAccount;
  const hasAmazon = (client.amazonRegions?.length ?? 0) > 0;
  const hasBoth   = hasMeli && hasAmazon;

  // Si tiene ambas plataformas, mostrar tab selector
  const [activeTab, setActiveTab] = useState<"amazon" | "meli">("amazon");

  const showAmazon = hasAmazon && (!hasBoth || activeTab === "amazon");
  const showMeli   = hasMeli   && (!hasBoth || activeTab === "meli");

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Dashboard" />
        <main className="flex-1 p-6">

          {/* Tab selector — solo aparece si el cliente opera en ambas plataformas */}
          {hasBoth && (
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1 mb-6 w-fit">
              <button
                onClick={() => setActiveTab("amazon")}
                className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "amazon" ? "bg-[#FF9900] text-black" : "text-[#8b949e] hover:text-white"}`}
              >
                Amazon
              </button>
              <button
                onClick={() => setActiveTab("meli")}
                className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "meli" ? "bg-[#FFE600] text-black" : "text-[#8b949e] hover:text-white"}`}
              >
                Mercado Libre
              </button>
            </div>
          )}

          {/* Vista según plataforma del cliente */}
          {showAmazon && <AmazonDashboard client={client} />}
          {showMeli   && <MeliDashboard   client={client} />}

          {/* Cliente sin plataformas configuradas */}
          {!hasMeli && !hasAmazon && (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-2xl">⚙️</div>
              <p className="text-white font-medium">Sin plataformas configuradas</p>
              <p className="text-[#8b949e] text-sm max-w-sm">
                El cliente <strong className="text-white">{client.label}</strong> no tiene Amazon ni Mercado Libre asociado todavía.
                Editá <code className="text-[#58a6ff]">src/lib/clients.ts</code> para configurarlo.
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
