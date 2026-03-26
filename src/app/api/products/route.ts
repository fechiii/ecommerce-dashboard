import { NextResponse } from "next/server";
import { getSalesTrafficUS, getSalesTrafficEU } from "@/lib/sheets";

export async function GET() {
  try {
    const [usData, euData] = await Promise.all([
      getSalesTrafficUS(1000),
      getSalesTrafficEU(1000),
    ]);

    type MarketplaceKey = "US" | "EU";
    interface AsinEntry {
      asin: string;
      parentAsin: string;
      byMarketplace: Record<MarketplaceKey, { sales: number; units: number; orders: number; pageViews: number; sessions: number; buyBoxSum: number; buyBoxCount: number; dates: string[] }>;
    }

    const asinMap: Record<string, AsinEntry> = {};

    const processRows = (rows: typeof usData, mkt: MarketplaceKey) => {
      rows.forEach((r) => {
        const key = r.childAsin || r.parentAsin;
        if (!key) return;
        if (!asinMap[key]) {
          asinMap[key] = {
            asin: r.childAsin || r.parentAsin || "",
            parentAsin: r.parentAsin || "",
            byMarketplace: {
              US: { sales: 0, units: 0, orders: 0, pageViews: 0, sessions: 0, buyBoxSum: 0, buyBoxCount: 0, dates: [] },
              EU: { sales: 0, units: 0, orders: 0, pageViews: 0, sessions: 0, buyBoxSum: 0, buyBoxCount: 0, dates: [] },
            },
          };
        }
        const m = asinMap[key].byMarketplace[mkt];
        m.sales += r.sales;
        m.units += r.unitsOrdered;
        m.orders += r.totalOrderItems;
        m.pageViews += r.pageViews;
        m.sessions += r.sessions;
        if (r.buyBoxPct > 0) { m.buyBoxSum += r.buyBoxPct; m.buyBoxCount++; }
        if (r.date) m.dates.push(r.date);
      });
    };

    processRows(usData, "US");
    processRows(euData, "EU");

    const products = Object.values(asinMap)
      .filter((p) => p.asin)
      .map((p) => {
        const us = p.byMarketplace.US;
        const eu = p.byMarketplace.EU;
        const totalSales = us.sales + eu.sales;
        const totalUnits = us.units + eu.units;
        const totalPV = us.pageViews + eu.pageViews;
        const totalSessions = us.sessions + eu.sessions;
        const allBBSum = us.buyBoxSum + eu.buyBoxSum;
        const allBBCount = us.buyBoxCount + eu.buyBoxCount;

        const allDates = [...us.dates, ...eu.dates].sort();
        const firstSeen = allDates[0] || "";
        const lastSeen = allDates[allDates.length - 1] || "";

        const activeIn: string[] = [];
        if (us.sales > 0) activeIn.push("US");
        if (eu.sales > 0) activeIn.push("EU");

        return {
          asin: p.asin,
          parentAsin: p.parentAsin,
          activeIn,
          totalSales: Math.round(totalSales),
          totalUnits,
          usSales: Math.round(us.sales),
          euSales: Math.round(eu.sales),
          usUnits: us.units,
          euUnits: eu.units,
          avgBuyBox: allBBCount > 0 ? Math.round((allBBSum / allBBCount) * 10) / 10 : 0,
          usBuyBox: us.buyBoxCount > 0 ? Math.round((us.buyBoxSum / us.buyBoxCount) * 10) / 10 : 0,
          euBuyBox: eu.buyBoxCount > 0 ? Math.round((eu.buyBoxSum / eu.buyBoxCount) * 10) / 10 : 0,
          totalPageViews: totalPV,
          totalSessions,
          convRate: totalSessions > 0 ? Math.round((totalUnits / totalSessions) * 1000) / 10 : 0,
          firstSeen,
          lastSeen,
        };
      })
      .filter((p) => p.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales);

    return NextResponse.json({ products, total: products.length });
  } catch (err: unknown) {
    console.error("[products API]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
