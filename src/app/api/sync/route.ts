import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/sheets";

const SPREADSHEET_ID = process.env.MASTER_SHEET_ID || "13QNNGGav491uGyGW5_MV34Fund3bT46qxZlUyXxz5EU";

// GET /api/sync — returns sheet metadata & tab info
export async function GET() {
  try {
    const sheets = await getSheetsClient();
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: "properties,sheets.properties",
    });

    const sheetTabs = (meta.data.sheets || []).map((s) => ({
      title: s.properties?.title || "",
      sheetId: s.properties?.sheetId,
      rowCount: s.properties?.gridProperties?.rowCount || 0,
      colCount: s.properties?.gridProperties?.columnCount || 0,
    }));

    return NextResponse.json({
      spreadsheetId: SPREADSHEET_ID,
      title: meta.data.properties?.title || "",
      locale: meta.data.properties?.locale || "",
      tabs: sheetTabs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[sync API]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

// POST /api/sync — reads row counts from key tabs to verify data freshness
export async function POST() {
  try {
    const sheets = await getSheetsClient();

    const tabs = [
      { name: "Sales & Traffic - US", range: "Sales & Traffic - US!A:A" },
      { name: "Sales & Traffic - EU", range: "Sales & Traffic - EU!A:A" },
      { name: "U1_queries", range: "U1_queries!A:A" },
    ];

    const results = await Promise.allSettled(
      tabs.map(async (tab) => {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: tab.range,
        });
        const rows = (res.data.values || []).length;
        const lastRow = rows > 1 ? (res.data.values?.[rows - 1]?.[0] || "") : "";
        return { tab: tab.name, rows: rows - 1, lastRow }; // -1 for header
      })
    );

    const tabStats = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { tab: tabs[i].name, rows: 0, lastRow: "", error: (r.reason as Error).message }
    );

    return NextResponse.json({
      status: "ok",
      verifiedAt: new Date().toISOString(),
      tabs: tabStats,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
