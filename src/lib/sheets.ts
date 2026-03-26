import { google } from "googleapis";
import type { SalesTrafficRow } from "./amazon";

const SPREADSHEET_ID = process.env.MASTER_SHEET_ID || "13QNNGGav491uGyGW5_MV34Fund3bT46qxZlUyXxz5EU";

export async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    // Read + write (needed for sync)
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function getAccessCredentials() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Access!A:E",
  });
  const rows = res.data.values || [];
  const [header, ...data] = rows;
  return data.map((row) => ({
    platform: row[0],
    appName: row[1],
    clientId: row[2],
    clientSecret: row[3],
    refreshToken: row[4],
  }));
}

export async function getSalesTrafficUS(limit = 200) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sales & Traffic - US!A:I",
  });
  const rows = res.data.values || [];
  const [, ...data] = rows;
  return data.slice(0, limit).map((row) => ({
    date: row[0],
    parentAsin: row[1],
    childAsin: row[2],
    sales: parseFloat(row[3]) || 0,
    totalOrderItems: parseInt(row[4]) || 0,
    unitsOrdered: parseInt(row[5]) || 0,
    buyBoxPct: parseFloat(row[6]) || 0,
    pageViews: parseInt(row[7]) || 0,
    sessions: parseInt(row[8]) || 0,
  }));
}

export async function getSalesTrafficEU(limit = 200) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sales & Traffic - EU!A:I",
  });
  const rows = res.data.values || [];
  const [, ...data] = rows;
  return data.slice(0, limit).map((row) => ({
    date: row[0],
    parentAsin: row[1],
    childAsin: row[2],
    sales: parseFloat(row[3]) || 0,
    totalOrderItems: parseInt(row[4]) || 0,
    unitsOrdered: parseInt(row[5]) || 0,
    buyBoxPct: parseFloat(row[6]) || 0,
    pageViews: parseInt(row[7]) || 0,
    sessions: parseInt(row[8]) || 0,
  }));
}

// ── Write functions (require Editor access on the Sheet) ──────────────────────

/**
 * Append rows to a Sales & Traffic tab.
 * Skips rows whose (date + childAsin) already exist in the sheet.
 */
export async function appendSalesTrafficRows(
  tabName: "Sales & Traffic - US" | "Sales & Traffic - EU",
  newRows: SalesTrafficRow[],
): Promise<{ appended: number; skipped: number }> {
  if (newRows.length === 0) return { appended: 0, skipped: 0 };

  const sheets = await getSheetsClient();

  // Read existing rows to deduplicate
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:C`,
  });
  const existingSet = new Set<string>();
  (existing.data.values || []).slice(1).forEach((r) => {
    const key = `${r[0]}|${r[2]}`; // date | childAsin
    if (key !== "|") existingSet.add(key);
  });

  const toAppend = newRows.filter((r) => !existingSet.has(`${r.date}|${r.childAsin}`));

  if (toAppend.length === 0) return { appended: 0, skipped: newRows.length };

  const values = toAppend.map((r) => [
    r.date,
    r.parentAsin,
    r.childAsin,
    r.sales.toFixed(2),
    r.totalOrderItems,
    r.unitsOrdered,
    r.buyBoxPct.toFixed(2),
    r.pageViews,
    r.sessions,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:I`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return { appended: toAppend.length, skipped: newRows.length - toAppend.length };
}

/**
 * Log a sync event to U1_queries tab.
 */
export async function logSyncEvent(entry: {
  runDate: string;
  region: string;
  marketplace: string;
  marketplaceId: string;
  reportType: string;
  granularity: string;
  dataStart: string;
  dataEnd: string;
  status: string;
}): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "U1_queries!A:I",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        entry.runDate,
        entry.region,
        entry.marketplace,
        entry.marketplaceId,
        entry.reportType,
        entry.granularity,
        entry.dataStart,
        entry.dataEnd,
        entry.status,
      ]],
    },
  });
}

export async function getQueryLog() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "U1_queries!A:I",
  });
  const rows = res.data.values || [];
  const [, ...data] = rows;
  return data.map((row) => ({
    runDate: row[0],
    region: row[1],
    marketplace: row[2],
    marketplaceId: row[3],
    reportType: row[4],
    granularity: row[5],
    dataStart: row[6],
    dataEnd: row[7],
    status: row[8],
  }));
}
