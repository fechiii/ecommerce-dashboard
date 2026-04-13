"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { MessageCircle, RefreshCw, Send, AlertCircle, CheckCircle } from "lucide-react";

interface Question {
  id: number;
  text: string;
  status: string;
  date_created: string;
  item_id: string;
  from: { id: number };
  answer?: { text: string; date_created: string };
}

interface AccountQuestions {
  accountId: string;
  total: number;
  questions: Question[];
  error?: string;
}

const ACCOUNT_LABELS: Record<string, string> = { filhos: "FILHOS", ugo: "UGO" };
const ACCOUNT_COLORS: Record<string, string> = { filhos: "#FFE600", ugo: "#00BFFF" };

export default function QuestionsPage() {
  const [data, setData] = useState<{ accounts: AccountQuestions[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccount] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [answering, setAnswering] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const status = showAll ? "all" : "UNANSWERED";
      const res = await fetch(`/api/meli/questions?account=all&status=${status}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [showAll]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const visibleAccounts = (data?.accounts ?? []).filter(
    (a) => activeAccount === "all" || a.accountId === activeAccount
  );

  const totalPending = (data?.accounts ?? []).reduce((s, a) => s + (a.total ?? 0), 0);

  async function sendAnswer(accountId: string, questionId: number) {
    if (!answerText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/meli/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: accountId, questionId, text: answerText }),
      });
      const result = await res.json();
      if (result.ok) {
        setToast({ msg: "Respuesta enviada con éxito", ok: true });
        setAnswering(null);
        setAnswerText("");
        setTimeout(() => fetchQuestions(), 1000);
      } else {
        setToast({ msg: result.error ?? "Error al enviar", ok: false });
      }
    } catch {
      setToast({ msg: "Error de red", ok: false });
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-auto">
        <Navbar title="Preguntas MeLi" />
        <main className="flex-1 p-6 space-y-6">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.ok ? "bg-[#3fb950]/20 border border-[#3fb950]/40 text-[#3fb950]" : "bg-red-900/20 border border-red-500/30 text-red-400"}`}>
              {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {toast.msg}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
                {["all", "filhos", "ugo"].map((acc) => (
                  <button
                    key={acc}
                    onClick={() => setActiveAccount(acc)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeAccount === acc ? "bg-[#FFE600] text-black" : "text-[#8b949e] hover:text-white"}`}
                  >
                    {acc === "all" ? "Todas" : ACCOUNT_LABELS[acc] ?? acc}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#8b949e]">Mostrar:</span>
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`px-3 py-1 rounded-md text-xs border transition-all ${showAll ? "bg-[#30363d] text-white border-[#58a6ff]" : "border-[#30363d] text-[#8b949e] hover:text-white"}`}
                >
                  {showAll ? "Todas las preguntas" : "Solo sin responder"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {totalPending > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-[#f0b429]">
                  <span className="w-2 h-2 rounded-full bg-[#f0b429] animate-pulse" />
                  {totalPending} sin responder
                </span>
              )}
              <button
                onClick={fetchQuestions}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white text-xs transition-all disabled:opacity-50"
              >
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Questions per account */}
          {loading ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center text-[#8b949e] text-sm">
              Cargando preguntas...
            </div>
          ) : visibleAccounts.map((acc) => (
            <div key={acc.accountId} className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              {/* Account header */}
              <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: ACCOUNT_COLORS[acc.accountId] ?? "#fff" }} />
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      {ACCOUNT_LABELS[acc.accountId] ?? acc.accountId}
                    </h3>
                    <p className="text-[#8b949e] text-xs mt-0.5">
                      {acc.error ? `Error: ${acc.error}` : `${acc.total} pregunta${acc.total !== 1 ? "s" : ""} ${showAll ? "" : "sin responder"}`}
                    </p>
                  </div>
                </div>
                {acc.total > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20">
                    {acc.total} pendiente{acc.total !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Questions list */}
              {!acc.error && acc.questions.length === 0 ? (
                <div className="px-5 py-8 text-center text-[#8b949e] text-sm flex flex-col items-center gap-2">
                  <CheckCircle size={20} className="text-[#3fb950]" />
                  Sin preguntas pendientes
                </div>
              ) : (
                <div className="divide-y divide-[#30363d]/50">
                  {acc.questions.map((q) => (
                    <div key={q.id} className="p-5 space-y-3">
                      {/* Question */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#30363d] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MessageCircle size={13} className="text-[#8b949e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[#58a6ff] text-[11px] font-mono bg-[#58a6ff]/10 px-1.5 py-0.5 rounded">
                              {q.item_id}
                            </code>
                            <span className="text-[#8b949e] text-[11px]">{q.date_created?.slice(0, 10)}</span>
                            {q.status === "UNANSWERED" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20">Sin responder</span>
                            )}
                          </div>
                          <p className="text-white text-sm leading-relaxed">{q.text}</p>
                        </div>
                      </div>

                      {/* Existing answer */}
                      {q.answer && (
                        <div className="ml-10 bg-[#0d1117] rounded-lg p-3 border-l-2 border-[#3fb950]/40">
                          <p className="text-[#3fb950] text-[11px] mb-1">Tu respuesta · {q.answer.date_created?.slice(0, 10)}</p>
                          <p className="text-[#8b949e] text-sm">{q.answer.text}</p>
                        </div>
                      )}

                      {/* Answer input */}
                      {q.status === "UNANSWERED" && (
                        <div className="ml-10">
                          {answering === q.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                placeholder="Escribí tu respuesta..."
                                rows={3}
                                className="w-full bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#8b949e] resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => sendAnswer(acc.accountId, q.id)}
                                  disabled={sending || !answerText.trim()}
                                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FFE600] text-black text-xs font-medium hover:bg-[#FFE600]/90 disabled:opacity-50 transition-all"
                                >
                                  <Send size={11} />
                                  {sending ? "Enviando..." : "Enviar respuesta"}
                                </button>
                                <button
                                  onClick={() => { setAnswering(null); setAnswerText(""); }}
                                  className="px-4 py-1.5 rounded-lg bg-[#30363d] text-[#8b949e] text-xs hover:text-white transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAnswering(q.id); setAnswerText(""); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#FFE600]/40 text-xs transition-all"
                            >
                              <MessageCircle size={11} />
                              Responder
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        </main>
      </div>
    </div>
  );
}
