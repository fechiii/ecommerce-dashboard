import { NextResponse } from "next/server";
import { getSalesTrafficUS, getSalesTrafficEU } from "@/lib/sheets";

export async function GET() {
  try {
    const [usData, euData] = await Promise.all([
      getSalesTrafficUS(500),
      getSalesTrafficEU(500),
    ]);

    // --- Stats totals (last 30 days) ---
    const totalSales = usData.reduce((s, r) => s + r.sales, 0) + euData.reduce((s, r) => s + r.sales, 0);
    const totalUnits = usData.reduce((s, r) => s + r.unitsOrdered, 0) + euData.reduce((s, r) => s + r.unitsOrdered, 0);
    const totalPageViews = usData.reduce((s, r) => s + r.pageViews, 0) + euData.reduce((s, r) => s + r.pageViews, 0);

    // Buy box avg (from US data, non-zero rows)
    const bbRows = usData.filter((r) => r.buyBoxPct > 0);
    const avgBuyBox = bbRows.length > 0 ? bbRows.reduce((s, r) => s + r.buyBoxPct, 0) / bbRows.length : 0;

    // --- Sales chart: aggregate by date (last 14 days) ---
    const usByDate: Record<string, number> = {};
    const euByDate: Record<string, number> = {};
    usData.forEach((r) => {
      if (r.date) usByDate[r.date] = (usByDate[r.date] || 0) + r.sales;
    });
    euData.forEach((r) => {
      if (r.date) euByDate[r.date] = (euByDate[r.date] || 0) + r.sales;
    });

    const allDates = [...new Set([...Object.keys(usByDate), ...Object.keys(euByDate)])].sort().slice(-14);
    const salesChart = allDates.map((date) => ({
      date,
      us: Math.round(usByDate[date] || 0),
      eu: Math.round(euByDate[date] || 0),
    }));

    // --- Traffic chart: sessions & page views by date (last 7) ---
    const sessionsByDate: Record<string, number> = {};
    const pvByDate: Record<string, number> = {};
    usData.forEach((r) => {
      if (r.date) {
        sessionsByDate[r.date] = (sessionsByDate[r.date] || 0) + r.sessions;
        pvByDate[r.date] = (pvByDate[r.date] || 0) + r.pageViews;
      }
    });
    const trafficDates = Object.keys(sessionsByDate).sort().slice(-7);
    const trafficChart = trafficDates.map((date) => ({
      name: date,
      sessions: sessionsByDate[date] || 0,
      pageViews: pvByDate[date] || 0,
    }));

    // --- Top ASINs by sales ---
    const asinMap: Record<string, { sales: number; units: number; buyBox: number[]; pageViews: number }> = {};
    usData.forEach((r) => {
      const key = r.childAsin || r.parentAsin;
      if (!key) return;
      if (!asinMap[key]) asinMap[key] = { sales: 0, units: 0, buyBox: [], pageViews: 0 };
      asinMap[key].sales += r.sales;
      asinMap[key].units += r.unitsOrdered;
      asinMap[key].pageViews += r.pageViews;
      if (r.buyBoxPct > 0) asinMap[key].buyBox.push(r.buyBoxPct);
    });
    const topAsins = Object.entries(asinMap)
      .map(([asin, v]) => ({
        asin,
        sales: Math.round(v.sales),
        units: v.units,
        buyBox: v.buyBox.length > 0 ? Math.round((v.buyBox.reduce((a, b) => a + b, 0) / v.buyBox.length) * 10) / 10 : 0,
        pageViews: v.pageViews,
      }))
      .filter((r) => r.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // --- Avg sessions ---
    const avgSessions = trafficChart.length > 0
      ? Math.round(trafficChart.reduce((s, r) => s + r.sessions, 0) / trafficChart.length)
      : 0;
    const totalSessions = trafficChart.reduce((s, r) => s + r.sessions, 0);
    const conversionRate = totalSessions > 0
      ? Math.round((totalUnits / totalSessions) * 1000) / 10
      : 0;

    return NextResponse.json({
      stats: {
        totalSales: Math.round(totalSales),
        totalUnits,
        totalPageViews,
        avgBuyBox: Math.round(avgBuyBox * 10) / 10,
      },
      salesChart,
      trafficChart,
      topAsins,
      meta: {
        avgSessions,
        conversionRate,
        rowsUS: usData.length,
        rowsEU: euData.length,
      },
    });
  } catch (err: unknown) {
    console.error("[dashboard API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
