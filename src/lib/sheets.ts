import { google } from "googleapis";

const SPREADSHEET_ID = "13QNNGGav491uGyGW5_MV34Fund3bT46qxZlUyXxz5EU";

export async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
