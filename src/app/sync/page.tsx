"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  RefreshCw, CheckCircle, XCircle, Database,
  ExternalLink, AlertCircle, Clock, Play, Download,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SheetTab  { title: string; sheetId: number; rowCount: number; colCount: number }
interface SheetMeta { spreadsheetId: string; title: string; locale: string; tabs: SheetTab[]; checkedAt: string }
interface TabStat   { tab: string; rows: number; lastRow: string; error?: string }
interface VerifyResult { status: string; verifiedAt: string; tabs: TabStat[] }

interface AmazonStatus {
  configured: boolean;
  credentials: { clientId: string; clientSecret: string; refreshToken: string };
  tokenStatus: "ok" | "error" | "not_configured";
  tokenError: string | null;
}

interface SyncLog {
  runDate: string; region: string; marketplace: string;
  marketplaceId: string; reportType: string; granularity: string;
  dataStart: string; dataEnd: string; status: string;
}

type SyncState = "idle" | "creating" | "polling" | "done" | "error";

const KEY_TABS = ["Sales & Traffic - US", "Sales & Traffic - EU", "U1_queries"];

const MKT_OPTIONS = [
  { key: "US", label: "🇺🇸 USA"    },
  { key: "UK", label: "🇬🇧 UK"     },
  { key: "DE", label: "🇩🇪 DE"     },
  { key: "ES", label: "🇪🇸 ES"     },
  { key: "IT", label: "🇮🇹 IT"     },
  { key: "FR", label: "🇫🇷 FR"     },
  { key: "CA", label: "🇨🇦 CA"     },
  { key: "MX", label: "🇲🇽 MX"     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today(): string { return new Date().toISOString().slice(0, 10); }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SyncPage() {
  // Google Sheet state
  const [meta,          setMeta]          = useState<SheetMeta | null>(null);
  const [verifyResult,  setVerifyResult]  = useState<VerifyResult | null>(null);
  const [loadingMeta,   setLoadingMeta]   = useState(true);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [sheetError,    setSheetError]    = useState<string | null>(null);
  const [tabsOpen,      setTabsOpen]      = useState(false);

  // Amazon SP-API state
  const [amazonStatus,  setAmazonStatus]  = useState<AmazonStatus | null>(null);
  const [loadingAmz,    setLoadingAmz]    = useState(true);
  const [syncLog,       setSyncLog]       = useState<SyncLog[]>([]);

  // Sync form
  const [syncMkt,       setSyncMkt]       = useState("US");
  const [syncFrom,      setSyncFrom]      = useState(daysAgo(7));
  const [syncTo,        setSyncTo]        = useState(today());
  const [syncState,     setSyncState]     = useState<SyncState>("idle");
  const [syncMsg,       setSyncMsg]       = useState("");
  const [syncResult,    setSyncResult]    = useState<Record<string, unknown> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch functions ──────────────────────────────────────────────────────
  async function fetchMeta() {
    setLoadingMeta(true); setSheetError(null);
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setMeta(await res.json());
    } catch (e: unknown) {
      setSheetError(e instanceof Error ? e.message : "Error");
    } finally { setLoadingMeta(false); }
  }

  async function runVerify() {
    setLoadingVerify(true); setSheetError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setVerifyResult(await res.json());
    } catch (e: unknown) {
      setSheetError(e instanceof Error ? e.message : "Error");
    } finally { setLoadingVerify(false); }
  }

  async function fetchAmazonStatus() {
    setLoadingAmz(true);
    try {
      const res = await fetch("/api/amazon");
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      setAmazonStatus(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingAmz(false); }
  }

  async function fetchSyncLog() {
    try {
      const res = await fetch("/api/amazon/sync");
      if (!res.ok) return;
      const data = await res.json();
      setSyncLog(data.log || []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchMeta();
    fetchAmazonStatus();
    fetchSyncLog();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── SP-API Sync ──────────────────────────────────────────────────────────
  async function startSync() {
    if (pollRef.current) clearInterval(pollRef.current);
    setSyncState("creating");
    setSyncMsg("Creando reporte en Amazon SP-API...");
    setSyncResult(null);

    try {
      // Step 1: create report
      const res = await fetch("/api/amazon/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", marketplaceKey: syncMkt, startDate: syncFrom, endDate: syncTo }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al crear reporte");

      const reportId = data.reportId as string;
      setSyncState("polling");
      setSyncMsg(`Reporte creado (${reportId.slice(0, 12)}...). Procesando en Amazon...`);

      // Step 2: poll every 15s
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        setSyncMsg(`Procesando... (intento ${attempts}, cada ~15s)`);
        try {
          const pollRes = await fetch("/api/amazon/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "download", marketplaceKey: syncMkt, reportId, startDate: syncFrom, endDate: syncTo }),
          });
          const pollData = await pollRes.json();

          if (pollData.action === "pending") {
            setSyncMsg(`Procesando... (${pollData.processingStatus})`);
            return; // keep polling
          }

          // Done or error
          if (pollRef.current) clearInterval(pollRef.current);

          if (!pollRes.ok || pollData.error) {
            setSyncState("error");
            setSyncMsg(pollData.error || "Error desconocido");
          } else {
            setSyncState("done");
            setSyncMsg(`✓ Sync completo: ${pollData.appended} filas nuevas, ${pollData.skipped} ya existían`);
            setSyncResult(pollData);
            fetchSyncLog(); // refresh log
            fetchMeta();    // refresh tab counts
          }
        } catch (e: unknown) {
          if (pollRef.current) clearInterval(pollRef.current);
          setSyncState("error");
          setSyncMsg(e instanceof Error ? e.message : "Error de polling");
        }
      }, 15_000);
    } catch (e: unknown) {
      setSyncState("error");
      setSyncMsg(e instanceof Error ? e.message : "Error desconocido");
    }
  }

  const canSync = amazonStatus?.tokenStatus === "ok" && syncState !== "creating" && syncState !== "polling";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Sincronizar" />
        <main className="flex-1 p-6 space-y-6">

          {/* ── Amazon SP-API sync card ──────────────────────────────────── */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF9900]/10 flex items-center justify-center">
                  <span className="text-[#FF9900] font-bold">A</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Amazon SP-API → Google Sheet</p>
                  <p className="text-[#8b949e] text-xs mt-0.5">Solicita un reporte Sales & Traffic y lo escribe en el Sheet</p>
                </div>
              </div>
              <button onClick={fetchAmazonStatus} disabled={loadingAmz}
                className="text-[#8b949e] hover:text-white p-1 rounded transition-all">
                <RefreshCw size={13} className={loadingAmz ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Credential status */}
            {loadingAmz ? (
              <div className="text-[#8b949e] text-xs flex items-center gap-2 mb-4">
                <RefreshCw size={11} className="animate-spin" /> Verificando credenciales...
              </div>
            ) : amazonStatus ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
                {Object.entries(amazonStatus.credentials).map(([k, v]) => (
                  <div key={k} className="bg-[#0d1117] rounded-lg px-3 py-2">
                    <p className="text-[#8b949e] text-[10px] capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                    <p className={`text-xs font-medium mt-0.5 ${v.startsWith("✓") ? "text-[#3fb950]" : "text-[#f85149]"}`}>{v}</p>
                  </div>
                ))}
                <div className="bg-[#0d1117] rounded-lg px-3 py-2">
                  <p className="text-[#8b949e] text-[10px]">Token LWA</p>
                  <p className={`text-xs font-medium mt-0.5 ${
                    amazonStatus.tokenStatus === "ok" ? "text-[#3fb950]" :
                    amazonStatus.tokenStatus === "error" ? "text-[#f85149]" : "text-[#f0b429]"
                  }`}>
                    {amazonStatus.tokenStatus === "ok" ? "✓ Válido" :
                     amazonStatus.tokenStatus === "error" ? "✗ Error" : "— Sin configurar"}
                  </p>
                </div>
              </div>
            ) : null}

            {amazonStatus?.tokenError && (
              <div className="bg-red-900/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-red-400 text-xs">
                {amazonStatus.tokenError}
              </div>
            )}

            {!amazonStatus?.configured && (
              <div className="bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-lg px-4 py-3 mb-4 text-[#f0b429] text-xs flex items-start gap-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Credenciales no configuradas</p>
                  <p className="mt-1 text-[#f0b429]/70">
                    Agregá <code className="bg-[#0d1117] px-1 rounded">AMZ_CLIENT_ID</code>,{" "}
                    <code className="bg-[#0d1117] px-1 rounded">AMZ_CLIENT_SECRET</code> y{" "}
                    <code className="bg-[#0d1117] px-1 rounded">AMZ_REFRESH_TOKEN</code> en las variables de entorno de Vercel.
                  </p>
                </div>
              </div>
            )}

            {/* Sync form */}
            <div className="border-t border-[#30363d] pt-5 space-y-4">
              <h4 className="text-white text-sm font-medium">Ejecutar sync manual</h4>

              <div className="flex flex-wrap gap-3 items-end">
                {/* Marketplace */}
                <div>
                  <label className="block text-[#8b949e] text-[10px] uppercase tracking-wider mb-1.5">Marketplace</label>
                  <div className="flex flex-wrap gap-1">
                    {MKT_OPTIONS.map((m) => (
                      <button key={m.key} onClick={() => setSyncMkt(m.key)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                          syncMkt === m.key
                            ? "bg-[#FF9900]/20 text-[#FF9900] border-[#FF9900]/30"
                            : "bg-[#0d1117] text-[#8b949e] border-[#30363d] hover:text-white"
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="block text-[#8b949e] text-[10px] uppercase tracking-wider mb-1.5">Desde</label>
                  <input type="date" value={syncFrom} onChange={(e) => setSyncFrom(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF9900] [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-[#8b949e] text-[10px] uppercase tracking-wider mb-1.5">Hasta</label>
                  <input type="date" value={syncTo} onChange={(e) => setSyncTo(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF9900] [color-scheme:dark]" />
                </div>

                {/* Quick ranges */}
                <div>
                  <label className="block text-[#8b949e] text-[10px] uppercase tracking-wider mb-1.5">Rápido</label>
                  <div className="flex gap-1">
                    {[7, 14, 30].map((d) => (
                      <button key={d} onClick={() => { setSyncFrom(daysAgo(d)); setSyncTo(today()); }}
                        className="px-2.5 py-1.5 rounded-md text-xs bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-white transition-all">
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Run button */}
                <button onClick={startSync} disabled={!canSync}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    canSync
                      ? "bg-[#FF9900] hover:bg-[#FF9900]/80 text-black"
                      : "bg-[#30363d] text-[#8b949e] cursor-not-allowed"
                  }`}>
                  {syncState === "creating" || syncState === "polling"
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Play size={14} />}
                  {syncState === "creating" ? "Creando..." : syncState === "polling" ? "Procesando..." : "Sincronizar"}
                </button>
              </div>

              {/* Sync status */}
              {syncState !== "idle" && (
                <div className={`rounded-xl px-5 py-4 text-sm border flex items-start gap-3 ${
                  syncState === "done"    ? "bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]" :
                  syncState === "error"   ? "bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]" :
                  "bg-[#1f6feb]/10 border-[#1f6feb]/30 text-[#58a6ff]"
                }`}>
                  {syncState === "done"    ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> :
                   syncState === "error"   ? <XCircle size={16} className="mt-0.5 shrink-0" /> :
                   <RefreshCw size={16} className="mt-0.5 shrink-0 animate-spin" />}
                  <div>
                    <p>{syncMsg}</p>
                    {syncState === "polling" && (
                      <p className="text-xs mt-1 opacity-70">Los reportes de Amazon pueden tardar 1–10 minutos en procesarse.</p>
                    )}
                    {syncResult && (
                      <div className="mt-2 grid grid-cols-3 gap-3">
                        {[
                          { label: "Filas totales", value: syncResult.rows as number },
                          { label: "Filas nuevas",  value: syncResult.appended as number },
                          { label: "Ya existían",   value: syncResult.skipped as number },
                        ].map((s) => (
                          <div key={s.label} className="bg-[#0d1117] rounded-lg p-2.5 text-center">
                            <p className="text-[#8b949e] text-[10px]">{s.label}</p>
                            <p className="text-white font-bold text-lg mt-0.5">{formatNumber(s.value ?? 0)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Sync log ────────────────────────────────────────────────── */}
          {syncLog.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                <div>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Download size={14} className="text-[#8b949e]" />
                    Historial de syncs
                  </h3>
                  <p className="text-[#8b949e] text-xs mt-0.5">{syncLog.length} registros en U1_queries</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      {["Fecha", "MKT", "Región", "Desde", "Hasta", "Estado"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-medium text-[#8b949e] px-5 py-3 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {syncLog.slice(0, 20).map((entry, i) => (
                      <tr key={i} className={`hover:bg-[#0d1117]/40 transition-colors ${i < syncLog.length - 1 ? "border-b border-[#30363d]/50" : ""}`}>
                        <td className="px-5 py-3 text-[#8b949e] text-xs font-mono">{entry.runDate?.slice(0, 16).replace("T", " ")}</td>
                        <td className="px-5 py-3 text-white text-sm font-medium">{entry.marketplace}</td>
                        <td className="px-5 py-3 text-[#8b949e] text-xs">{entry.region}</td>
                        <td className="px-5 py-3 text-[#8b949e] text-xs font-mono">{entry.dataStart}</td>
                        <td className="px-5 py-3 text-[#8b949e] text-xs font-mono">{entry.dataEnd}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            entry.status?.startsWith("OK")
                              ? "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20"
                              : entry.status?.startsWith("FAILED")
                              ? "bg-[#f85149]/10 text-[#f85149] border-[#f85149]/20"
                              : "bg-[#f0b429]/10 text-[#f0b429] border-[#f0b429]/20"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Google Sheet card ────────────────────────────────────────── */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0d1117] flex items-center justify-center">
                  <Database size={20} className="text-[#58a6ff]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Google Sheets — Master Sheet</p>
                  <p className="text-[#8b949e] text-xs mt-0.5">Fuente principal de datos del dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingMeta ? (
                  <span className="text-[#8b949e] text-xs flex items-center gap-1"><RefreshCw size={11} className="animate-spin" />Verificando...</span>
                ) : meta ? (
                  <span className="flex items-center gap-1.5 text-[#3fb950] text-xs font-medium"><CheckCircle size={13} />Conectado</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[#f85149] text-xs font-medium"><XCircle size={13} />Sin conexión</span>
                )}
                <button onClick={fetchMeta} disabled={loadingMeta}
                  className="text-[#8b949e] hover:text-white p-1 rounded transition-all">
                  <RefreshCw size={13} className={loadingMeta ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {sheetError && (
              <div className="bg-red-900/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-red-400 text-xs flex items-start gap-2">
                <XCircle size={13} className="mt-0.5 shrink-0" />
                <span>{sheetError}</span>
              </div>
            )}

            {meta && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Nombre</p>
                    <p className="text-white text-xs font-medium mt-0.5 truncate">{meta.title}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Tabs totales</p>
                    <p className="text-white text-sm font-bold mt-0.5">{meta.tabs.length}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Locale</p>
                    <p className="text-white text-sm font-bold mt-0.5">{meta.locale || "—"}</p>
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3">
                    <p className="text-[#8b949e] text-[10px]">Verificado</p>
                    <p className="text-white text-xs font-medium mt-0.5">
                      {new Date(meta.checkedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a href={`https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#58a6ff] text-xs hover:underline">
                    <ExternalLink size={11} /> Abrir en Google Sheets
                  </a>
                  <button onClick={() => setTabsOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-[#8b949e] text-xs hover:text-white transition-all">
                    {tabsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {tabsOpen ? "Ocultar" : "Ver"} {meta.tabs.length} tabs
                  </button>
                </div>

                {tabsOpen && (
                  <div className="border border-[#30363d] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#30363d] bg-[#0d1117]">
                          {["Nombre", "Filas máx.", "Cols", "Estado"].map((h) => (
                            <th key={h} className="text-left text-[11px] font-medium text-[#8b949e] px-4 py-2.5 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {meta.tabs.map((tab, i) => {
                          const isKey = KEY_TABS.includes(tab.title);
                          return (
                            <tr key={tab.sheetId} className={`hover:bg-[#0d1117]/40 transition-colors ${i < meta.tabs.length - 1 ? "border-b border-[#30363d]/50" : ""}`}>
                              <td className="px-4 py-2.5 flex items-center gap-2">
                                <span className="text-white text-sm">{tab.title}</span>
                                {isKey && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/20">clave</span>}
                              </td>
                              <td className="px-4 py-2.5 text-[#8b949e] text-sm">{formatNumber(tab.rowCount)}</td>
                              <td className="px-4 py-2.5 text-[#8b949e] text-sm">{tab.colCount}</td>
                              <td className="px-4 py-2.5">
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
                )}
              </div>
            )}
          </div>

          {/* ── Verify freshness ────────────────────────────────────────── */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-sm">Verificar datos del Sheet</h3>
                <p className="text-[#8b949e] text-xs mt-0.5">Conteo de filas y fecha del dato más reciente en cada tab clave</p>
              </div>
              <button onClick={runVerify} disabled={loadingVerify}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1f6feb] hover:bg-[#1f6feb]/80 text-white text-xs font-medium disabled:opacity-50 transition-all">
                <RefreshCw size={12} className={loadingVerify ? "animate-spin" : ""} />
                {loadingVerify ? "Verificando..." : "Verificar ahora"}
              </button>
            </div>

            {!verifyResult && !loadingVerify && (
              <div className="flex items-center gap-3 text-[#8b949e] text-sm py-2">
                <AlertCircle size={16} />
                <span>Hacé clic en "Verificar ahora" para leer el estado de las tabs</span>
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
                {verifyResult.tabs.map((tab) => (
                  <div key={tab.tab} className={`bg-[#0d1117] border rounded-xl p-4 ${tab.error ? "border-[#f85149]/30" : "border-[#30363d]"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-sm font-medium">{tab.tab}</p>
                      {tab.error
                        ? <span className="flex items-center gap-1 text-[#f85149] text-xs"><XCircle size={12} /> Error</span>
                        : <span className="flex items-center gap-1 text-[#3fb950] text-xs"><CheckCircle size={12} /> OK</span>}
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

        </main>
      </div>
    </div>
  );
}
