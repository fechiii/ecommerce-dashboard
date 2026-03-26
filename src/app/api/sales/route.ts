import { NextRequest, NextResponse } from "next/server";
import { getSalesTrafficUS, getSalesTrafficEU } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const marketplace = searchParams.get("marketplace") || "all"; // us | eu | all
  const days = parseInt(searchParams.get("days") || "30");

  try {
    const [usRaw, euRaw] = await Promise.all([
      marketplace !== "eu" ? getSalesTrafficUS(1000) : Promise.resolve([]),
      marketplace !== "us" ? getSalesTrafficEU(1000) : Promise.resolve([]),
    ]);

    // Tag each row with its marketplace
    const usRows = usRaw.map((r) => ({ ...r, marketplace: "US" as const }));
    const euRows = euRaw.map((r) => ({ ...r, marketplace: "EU" as const }));
    const allRows = [...usRows, ...euRows];

    // Filter to last N days by date string (format: YYYY-MM-DD or similar)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = allRows.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return !isNaN(d.getTime()) ? d >= cutoff : true; // keep if date unparseable
    });

    // --- Aggregate by date per marketplace ---
    const byDate: Record<string, { us: number; eu: number; units: number; sessions: number; pageViews: number }> = {};
    filtered.forEach((r) => {
      if (!r.date) return;
      if (!byDate[r.date]) byDate[r.date] = { us: 0, eu: 0, units: 0, sessions: 0, pageViews: 0 };
      if (r.marketplace === "US") byDate[r.date].us += r.sales;
      else byDate[r.date].eu += r.sales;
      byDate[r.date].units += r.unitsOrdered;
      byDate[r.date].sessions += r.sessions;
      byDate[r.date].pageViews += r.pageViews;
    });

    const chartData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        us: Math.round(v.us),
        eu: Math.round(v.eu),
        total: Math.round(v.us + v.eu),
        units: v.units,
        sessions: v.sessions,
        pageViews: v.pageViews,
      }));

    // --- Aggregate by ASIN ---
    const asinMap: Record<string, {
      asin: string; parentAsin: string; marketplace: string;
      sales: number; units: number; orders: number;
      buyBoxSum: number; buyBoxCount: number;
      pageViews: number; sessions: number;
    }> = {};

    filtered.forEach((r) => {
      const key = `${r.marketplace}|${r.childAsin || r.parentAsin}`;
      if (!key) return;
      if (!asinMap[key]) asinMap[key] = {
        asin: r.childAsin || r.parentAsin || "",
        parentAsin: r.parentAsin || "",
        marketplace: r.marketplace,
        sales: 0, units: 0, orders: 0,
        buyBoxSum: 0, buyBoxCount: 0,
        pageViews: 0, sessions: 0,
      };
      asinMap[key].sales += r.sales;
      asinMap[key].units += r.unitsOrdered;
      asinMap[key].orders += r.totalOrderItems;
      asinMap[key].pageViews += r.pageViews;
      asinMap[key].sessions += r.sessions;
      if (r.buyBoxPct > 0) {
        asinMap[key].buyBoxSum += r.buyBoxPct;
        asinMap[key].buyBoxCount++;
      }
    });

    const asinTable = Object.values(asinMap)
      .filter((r) => r.asin && r.sales > 0)
      .map((r) => ({
        asin: r.asin,
        parentAsin: r.parentAsin,
        marketplace: r.marketplace,
        sales: Math.round(r.sales),
        units: r.units,
        orders: r.orders,
        buyBox: r.buyBoxCount > 0 ? Math.round((r.buyBoxSum / r.buyBoxCount) * 10) / 10 : 0,
        pageViews: r.pageViews,
        sessions: r.sessions,
        convRate: r.sessions > 0 ? Math.round((r.units / r.sessions) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    // --- Totals ---
    const totalSales = filtered.reduce((s, r) => s + r.sales, 0);
    const totalUnits = filtered.reduce((s, r) => s + r.unitsOrdered, 0);
    const totalOrders = filtered.reduce((s, r) => s + r.totalOrderItems, 0);
    const totalPageViews = filtered.reduce((s, r) => s + r.pageViews, 0);
    const totalSessions = filtered.reduce((s, r) => s + r.sessions, 0);
    const bbRows = filtered.filter((r) => r.buyBoxPct > 0);
    const avgBuyBox = bbRows.length > 0 ? bbRows.reduce((s, r) => s + r.buyBoxPct, 0) / bbRows.length : 0;

    // Sales comparison: same period before (prev N days)
    const prevCutoff = new Date(cutoff);
    prevCutoff.setDate(prevCutoff.getDate() - days);
    const prevRows = allRows.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d >= prevCutoff && d < cutoff;
    });
    const prevSales = prevRows.reduce((s, r) => s + r.sales, 0);
    const salesChange = prevSales > 0 ? Math.round(((totalSales - prevSales) / prevSales) * 1000) / 10 : 0;

    return NextResponse.json({
      totals: {
        sales: Math.round(totalSales),
        units: totalUnits,
        orders: totalOrders,
        pageViews: totalPageViews,
        sessions: totalSessions,
        avgBuyBox: Math.round(avgBuyBox * 10) / 10,
        salesChange,
        convRate: totalSessions > 0 ? Math.round((totalUnits / totalSessions) * 1000) / 10 : 0,
      },
      chartData,
      asinTable,
      meta: { rows: filtered.length, days, marketplace },
    });
  } catch (err: unknown) {
    console.error("[sales API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al cargar ventas" },
      { status: 500 }
    );
  }
}
