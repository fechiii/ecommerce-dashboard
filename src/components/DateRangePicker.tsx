"use client";
import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useDateRange, type DateRange } from "@/lib/DateContext";
import {
  format, subDays, startOfMonth, endOfMonth, subMonths, addMonths,
  getDaysInMonth, getFirstDayOfMonth, formatDisplay,
  MONTH_NAMES, DAY_NAMES,
} from "@/lib/dateUtils";

// ── Presets ───────────────────────────────────────────────────────────────────

function buildPresets(): { label: string; from: string; to: string }[] {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const som = startOfMonth(today);
  const lm = subMonths(today, 1);
  return [
    { label: "Hoy",              from: format(today),     to: format(today) },
    { label: "Ayer",             from: format(yesterday), to: format(yesterday) },
    { label: "Últimos 7 días",   from: format(subDays(today, 6)),  to: format(today) },
    { label: "Últimos 14 días",  from: format(subDays(today, 13)), to: format(today) },
    { label: "Últimos 30 días",  from: format(subDays(today, 29)), to: format(today) },
    { label: "Últimos 60 días",  from: format(subDays(today, 59)), to: format(today) },
    { label: "Últimos 90 días",  from: format(subDays(today, 89)), to: format(today) },
    { label: "Este mes",         from: format(som),       to: format(today) },
    { label: "Mes anterior",     from: format(startOfMonth(lm)), to: format(endOfMonth(lm)) },
  ];
}

// ── Single month calendar ─────────────────────────────────────────────────────

function MonthCalendar({
  year, month, selecting, startDate, endDate, hoverDate,
  onDayClick, onDayHover,
}: {
  year: number;
  month: number;
  selecting: "start" | "end";
  startDate: string;
  endDate: string;
  hoverDate: string;
  onDayClick: (d: string) => void;
  onDayHover: (d: string) => void;
}) {
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const today = format(new Date());

  const rangeEnd = selecting === "end" && hoverDate ? hoverDate : endDate;

  function cellClass(dateStr: string): string {
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate || (selecting === "end" && dateStr === hoverDate);
    const inRange = startDate && rangeEnd && dateStr > startDate && dateStr < rangeEnd;
    const isToday = dateStr === today;

    let cls = "relative flex items-center justify-center h-8 w-8 mx-auto text-xs cursor-pointer select-none rounded-full transition-all ";

    if (isStart || isEnd) {
      cls += "bg-[#FFE600] text-black font-bold ";
    } else if (inRange) {
      cls += "bg-[#FFE600]/15 text-white rounded-none ";
    } else if (isToday) {
      cls += "text-[#FFE600] font-medium border border-[#FFE600]/30 ";
    } else {
      cls += "text-[#c9d1d9] hover:bg-[#30363d] hover:text-white ";
    }
    return cls;
  }

  // Leading empty cells
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="w-56">
      <p className="text-center text-white text-sm font-semibold mb-3">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] text-[#8b949e] font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          return (
            <div
              key={day}
              className={cellClass(dateStr)}
              onClick={() => onDayClick(dateStr)}
              onMouseEnter={() => onDayHover(dateStr)}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DateRangePicker() {
  const { range, setRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(range.from);
  const [endDate, setEndDate] = useState(range.to);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [hoverDate, setHoverDate] = useState("");
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = new Date(range.from + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Right calendar = left + 1 month
  const rightMonth = addMonths(new Date(leftMonth.year, leftMonth.month, 1), 1);

  function handleDayClick(dateStr: string) {
    if (selecting === "start") {
      setStartDate(dateStr);
      setEndDate("");
      setSelecting("end");
    } else {
      if (dateStr < startDate) {
        setEndDate(startDate);
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
      setSelecting("start");
    }
  }

  function applyRange() {
    if (!startDate || !endDate) return;
    const from = startDate < endDate ? startDate : endDate;
    const to   = startDate < endDate ? endDate : startDate;
    setRange({ from, to, label: `${formatDisplay(from)} – ${formatDisplay(to)}` });
    setOpen(false);
  }

  function applyPreset(p: { label: string; from: string; to: string }) {
    setStartDate(p.from);
    setEndDate(p.to);
    setRange({ from: p.from, to: p.to, label: p.label });
    setOpen(false);
  }

  function prevMonth() {
    const d = subMonths(new Date(leftMonth.year, leftMonth.month, 1), 1);
    setLeftMonth({ year: d.getFullYear(), month: d.getMonth() });
  }
  function nextMonth() {
    const d = addMonths(new Date(leftMonth.year, leftMonth.month, 1), 1);
    setLeftMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const presets = buildPresets();

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] text-white text-xs px-3 py-1.5 rounded-lg hover:border-[#58a6ff] transition-all"
      >
        <CalendarDays size={13} className="text-[#8b949e]" />
        <span>{range.label}</span>
        {open && <X size={12} className="text-[#8b949e] ml-1" />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl flex overflow-hidden">
          {/* Left: Calendar */}
          <div className="p-4 border-r border-[#30363d]">
            {/* Nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-all">
                <ChevronLeft size={15} />
              </button>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-all">
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex gap-6">
              <MonthCalendar
                year={leftMonth.year}
                month={leftMonth.month}
                selecting={selecting}
                startDate={startDate}
                endDate={endDate}
                hoverDate={hoverDate}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
              <MonthCalendar
                year={rightMonth.getFullYear()}
                month={rightMonth.getMonth()}
                selecting={selecting}
                startDate={startDate}
                endDate={endDate}
                hoverDate={hoverDate}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between">
              <div className="text-xs text-[#8b949e]">
                {startDate && (
                  <span>
                    <span className="text-white">{formatDisplay(startDate)}</span>
                    {endDate && <> → <span className="text-white">{formatDisplay(endDate)}</span></>}
                  </span>
                )}
                {!startDate && <span>Seleccioná una fecha de inicio</span>}
                {startDate && !endDate && selecting === "end" && <span className="ml-2 text-[#FFE600]">Seleccioná fecha fin</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStartDate(range.from); setEndDate(range.to); setOpen(false); }}
                  className="px-3 py-1.5 rounded-lg bg-[#30363d] text-[#8b949e] text-xs hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyRange}
                  disabled={!startDate || !endDate}
                  className="px-3 py-1.5 rounded-lg bg-[#FFE600] text-black text-xs font-medium hover:bg-[#FFE600]/90 disabled:opacity-40 transition-all"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>

          {/* Right: Presets */}
          <div className="w-44 py-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`w-full text-left px-4 py-2 text-xs transition-all ${
                  range.label === p.label
                    ? "text-[#FFE600] bg-[#FFE600]/10 font-medium"
                    : "text-[#8b949e] hover:text-white hover:bg-[#30363d]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
