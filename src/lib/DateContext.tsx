"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { subDays, startOfMonth, endOfMonth, subMonths, format } from "@/lib/dateUtils";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
  label: string;
}

interface DateContextValue {
  range: DateRange;
  setRange: (r: DateRange) => void;
}

const DEFAULT: DateRange = {
  from: format(subDays(new Date(), 29)),
  to:   format(new Date()),
  label: "Últimos 30 días",
};

const DateContext = createContext<DateContextValue>({
  range: DEFAULT,
  setRange: () => {},
});

export function DateProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>(DEFAULT);
  return <DateContext.Provider value={{ range, setRange }}>{children}</DateContext.Provider>;
}

export function useDateRange() {
  return useContext(DateContext);
}
