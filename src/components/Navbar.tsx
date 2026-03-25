"use client";
import { Bell, RefreshCw, Search } from "lucide-react";

export default function Navbar({ title = "Dashboard" }: { title?: string }) {
  return (
    <header className="h-14 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-semibold text-base">{title}</h1>
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
          <input
            type="text"
            placeholder="Buscar ASIN, producto..."
            className="bg-[#161b22] border border-[#30363d] text-sm text-white pl-9 pr-4 py-1.5 rounded-lg w-64 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#8b949e]"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] text-[#8b949e] text-xs px-3 py-1.5 rounded-lg hover:text-white hover:border-[#58a6ff] transition-all">
          <RefreshCw size={12} />
          Sincronizar
        </button>
        <button className="relative p-2 text-[#8b949e] hover:text-white">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#f85149] rounded-full"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF9900] to-[#FFE600] flex items-center justify-center text-black font-bold text-xs">F</div>
      </div>
    </header>
  );
}
