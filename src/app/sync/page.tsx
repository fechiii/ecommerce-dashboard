"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { RefreshCw, CheckCircle, XCircle, Database, ExternalLink, AlertCircle, Clock } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface SheetTab {
  title: string;
  sheetId: number;
  rowCount: number;
  colCount: number;
}

interface SheetMeta {
  spreadsheetId: string;
  title: string;
  locale: string;
  tabs: SheetTab[];
  checkedAt: string;
}

interface TabStat {
  tab: string;
  rows: number;
  lastRow: string;
  error?: string;
}

interface VerifyResult {
  status: string;
  verifiedAt: string;
  tabs: TabStat[];
}

const KEY_TABS = ["Sales & Traffic - US", "Sales & Traffic - EU", "U1_queries"];

export default function SyncPage() {
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMeta() {
    setLoadingMeta(true);
    setError(null);
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setMeta(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoadingMeta(false);
    }
  }

  async function runVerify() {
    setLoadingVerify(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setVerifyResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoadingVerify(false);
    }
  }

  useEffect(() => { fetchMeta(); }, []);

  const keyTabStats = verifyResult?.tabs || [];

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Sincronizar" />
        <main className="flex-1 p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-base">Estado de conexión</h2>
              <p className="text-[#8b949e] text-xs mt-0.5">Verificación de Google Sheets y fuentes de datos</p>
            </div>
            <button onClick={fetchMeta} disabled={loadingMeta}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs disabled:opacity-50 transition-all">
              <RefreshCw size={11} className={loadingMeta ? "animate-spin" : ""} />
              Refrescar
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm flex items-start gap-3">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Error de conexión</p>
                <p className="mt-1 text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sheets connection card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0d1117] flex items-center justify-center">
                  <Database size={20} className="text-[#58a6ff]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Google Sheets</p>
                  <p className="text-[#8b949e] text-xs mt-0.5">Master Sheet — fuente principal de datos</p>
                </div>
              </div>
              {loadingMeta ? (
                <div className="flex items-center gap-1.5 text-[#8b949e] text-xs">
                  <RefreshCw size={11} className="animate-spin" /> Verificando...
                </div>
              ) : meta ? (
                <span className="flex items-center gap-1.5 text-[#3fb950] text-xs font-medium">
                  <CheckCircle size={13} /> Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[#f85149] text-xs font-medium">
                  <XCircle size={13} /> Sin conexión
                </span>
              )}
            </div>

            {meta && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Spreadsheet</p>
                    <p className="text-white text-xs font-medium mt-0.5 truncate">{meta.title}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Tabs en el sheet</p>
                    <p className="text-white text-sm font-bold mt-0.5">{meta.tabs.length}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Locale</p>
                    <p className="text-white text-sm font-bold mt-0.5">{meta.locale || "—"}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Última verificación</p>
                    <p className="text-white text-xs font-medium mt-0.5">{new Date(meta.checkedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                  </div>
                </div>

                <a href={`https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#58a6ff] text-xs hover:underline">
                  <ExternalLink size={11} /> Abrir en Google Sheets
                </a>
              </>
            )}
          </div>

          {/* Tabs in sheet */}
          {meta && meta.tabs.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#30363d]">
                <h3 className="text-white font-semibold text-sm">Tabs detectadas</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">{meta.tabs.length} hojas en el spreadsheet</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      {["Nombre", "Filas máx.", "Columnas", "Estado"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-medium text-[#8b949e] px-5 py-3 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meta.tabs.map((tab, i) => {
                      const isKey = KEY_TABS.includes(tab.title);
                      return (
                        <tr key={tab.sheetId} className={`hover:bg-[#0d1117]/40 transition-colors ${i < meta.tabs.length - 1 ? "border-b border-[#30363d]/50" : ""}`}>
                          <td className="px-5 py-3 flex items-center gap-2">
                            <span className="text-white text-sm">{tab.title}</span>
                            {isKey && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/20">clave</span>}
                          </td>
                          <td className="px-5 py-3 text-[#8b949e] text-sm">{formatNumber(tab.rowCount)}</td>
                          <td className="px-5 py-3 text-[#8b949e] text-sm">{tab.colCount}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${isKey ? "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20" : "bg-[#8b949e]/10 text-[#8b949e] border-[#8b949e]/20"}`}>
                              {isKey ? "activa" : "secundaria"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Verify data freshness */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-sm">Verificar datos</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">Lee las tabs clave y muestra el conteo de filas y el dato más reciente</p>
              </div>
              <button onClick={runVerify} disabled={loadingVerify}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1f6feb] hover:bg-[#1f6feb]/80 text-white text-xs font-medium disabled:opacity-50 transition-all">
                <RefreshCw size={12} className={loadingVerify ? "animate-spin" : ""} />
                {loadingVerify ? "Verificando..." : "Verificar ahora"}
              </button>
            </div>

            {!verifyResult && !loadingVerify && (
              <div className="flex items-center gap-3 text-[#8b949e] text-sm py-4">
                <AlertCircle size={16} />
                <span>Hacé clic en "Verificar ahora" para leer el estado actual de las tabs</span>
              </div>
            )}

            {loadingVerify && (
              <div className="space-y-3">
                {KEY_TABS.map((t) => (
                  <div key={t} className="bg-[#0d1117] rounded-lg p-4 flex items-center gap-3">
                    <RefreshCw size={13} className="text-[#8b949e] animate-spin" />
                    <span className="text-[#8b949e] text-sm">{t}...</span>
                  </div>
                ))}
              </div>
            )}

            {verifyResult && !loadingVerify && (
              <div className="space-y-3">
                <p className="text-[#8b949e] text-xs flex items-center gap-1.5">
                  <Clock size={11} />
                  Verificado: {new Date(verifyResult.verifiedAt).toLocaleString("es-AR")}
                </p>
                {keyTabStats.map((tab) => (
                  <div key={tab.tab} className={`bg-[#0d1117] border rounded-xl p-4 ${tab.error ? "border-[#f85149]/30" : "border-[#30363d]"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-sm font-medium">{tab.tab}</p>
                      {tab.error ? (
                        <span className="flex items-center gap-1 text-[#f85149] text-xs"><XCircle size={12} /> Error</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#3fb950] text-xs"><CheckCircle size={12} /> OK</span>
                      )}
                    </div>
                    {tab.error ? (
                      <p className="text-[#f85149]/80 text-xs">{tab.error}</p>
                    ) : (
                      <div className="flex gap-6 text-xs">
                        <div><span className="text-[#8b949e]">Filas: </span><span className="text-white font-semibold">{formatNumber(tab.rows)}</span></div>
                        {tab.lastRow && <div><span className="text-[#8b949e]">Último dato: </span><span className="text-white font-mono">{tab.lastRow}</span></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platforms status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
                    <span className="text-[#FF9900] font-bold text-sm">A</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Amazon SP-API</p>
                    <p className="text-[#8b949e] text-xs">Datos via Google Sheets</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[#3fb950] text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                  Conectado
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#8b949e]">Marketplaces</span><span className="text-white">US · EU · UK</span></div>
                <div className="flex justify-between"><span className="text-[#8b949e]">Modo de datos</span><span className="text-white">Google Sheets sync</span></div>
                <div className="flex justify-between"><span className="text-[#8b949e]">Cuenta de servicio</span><span className="text-white text-[10px] font-mono truncate max-w-[160px]">ecommerce-dashboard@...</span></div>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#FFE600]/10 rounded-xl flex items-center justify-center">
                    <span className="text-[#FFE600] font-bold text-sm">M</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Mercado Libre</p>
                    <p className="text-[#8b949e] text-xs">App 5427076205404931</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[#f0b429] text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429] animate-pulse" />
                  Pendiente
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#8b949e]">OAuth</span><span className="text-[#f0b429]">No configurado</span></div>
                <div className="flex justify-between"><span className="text-[#8b949e]">Access Token</span><span className="text-[#f0b429]">Pendiente</span></div>
                <div className="flex justify-between"><span className="text-[#8b949e]">App ID</span><span className="text-white">5427076205404931</span></div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
