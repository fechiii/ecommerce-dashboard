"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, TrendingUp, Database, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Ventas", icon: TrendingUp },
  { href: "/products", label: "Productos", icon: ShoppingBag },
  { href: "/queries", label: "Queries Log", icon: Database },
  { href: "/sync", label: "Sincronizar", icon: RefreshCw },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
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
        <select className="w-full bg-[#161b22] border border-[#30363d] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff]">
          <option>UNIT 1</option>
          <option>Cliente 2</option>
          <option>Cliente 3</option>
        </select>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
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
        ))}
      </nav>

      {/* Platforms */}
      <div className="px-4 py-4 border-t border-[#30363d]">
        <p className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-3">Plataformas</p>
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded text-[11px] font-medium bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30">Amazon</span>
          <span className="px-2 py-1 rounded text-[11px] font-medium bg-[#FFE600]/20 text-[#FFE600] border border-[#FFE600]/30">MeLi</span>
        </div>
      </div>
    </aside>
  );
}
