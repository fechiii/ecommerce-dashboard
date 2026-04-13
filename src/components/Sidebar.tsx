"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, TrendingUp, Database, Settings, RefreshCw, Store, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClient } from "@/lib/ClientContext";

const nav = [
  { href: "/",               label: "Dashboard",      icon: LayoutDashboard },
  { href: "/sales",          label: "Ventas Amazon",  icon: TrendingUp },
  { href: "/meli",           label: "Mercado Libre",  icon: Store },
  { href: "/meli/questions", label: "Preguntas MeLi", icon: MessageCircle },
  { href: "/products",       label: "Productos",      icon: ShoppingBag },
  { href: "/queries",        label: "Queries Log",    icon: Database },
  { href: "/sync",           label: "Sincronizar",    icon: RefreshCw },
  { href: "/settings",       label: "Configuración",  icon: Settings },
];

// Plataformas disponibles por cliente
const CLIENT_PLATFORMS: Record<string, { amazon: boolean; meli: boolean }> = {
  unit1:    { amazon: true,  meli: false },
  filhos:   { amazon: false, meli: true  },
  ugo:      { amazon: false, meli: true  },
  holiherb: { amazon: true,  meli: false },
};

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { client, clients, setClientId } = useClient();

  function handleClientChange(id: string) {
    setClientId(id);
    // Redirigir a home al cambiar cliente
    router.push("/");
  }

  const platforms = CLIENT_PLATFORMS[client.id] ?? { amazon: true, meli: true };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0d1117] border-r border-[#30363d] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF9900] to-[#FFE600] flex items-center justify-center text-black font-bold text-sm">E</div>
          <span className="font-semibold text-white text-sm">Ecommerce Hub</span>
        </div>
      </div>

      {/* Client selector */}
      <div className="px-4 py-3 border-b border-[#30363d]">
        <p className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-2">Cliente</p>
        <div className="relative">
          <select
            value={client.id}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full bg-[#161b22] border border-[#30363d] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff] appearance-none cursor-pointer"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e]">▾</div>
        </div>
        {/* Client indicator dot */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
          <span className="text-[10px] text-[#8b949e]">
            {platforms.meli && platforms.amazon
              ? "Amazon · MeLi"
              : platforms.meli
              ? "Mercado Libre"
              : "Amazon"}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          // Ocultar secciones no relevantes para el cliente actual
          const isMeliRoute = href.startsWith("/meli");
          const isAmazonRoute = href === "/sales" || href === "/queries" || href === "/sync";
          if (isMeliRoute && !platforms.meli) return null;
          if (isAmazonRoute && !platforms.amazon && !platforms.meli) return null;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                path === href
                  ? "bg-[#1f6feb] text-white font-medium"
                  : "text-[#8b949e] hover:bg-[#161b22] hover:text-white"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Platforms */}
      <div className="px-4 py-4 border-t border-[#30363d]">
        <p className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-3">Plataformas activas</p>
        <div className="flex gap-2 flex-wrap">
          {platforms.amazon && (
            <span className="px-2 py-1 rounded text-[11px] font-medium bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30">Amazon</span>
          )}
          {platforms.meli && (
            <span className="px-2 py-1 rounded text-[11px] font-medium bg-[#FFE600]/20 text-[#FFE600] border border-[#FFE600]/30">MeLi</span>
          )}
        </div>
      </div>
    </aside>
  );
}
