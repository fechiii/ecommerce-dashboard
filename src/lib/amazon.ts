/**
 * Amazon SP-API Client
 * Handles: LWA token refresh → Report creation → Polling → Download → Parse
 *
 * Report type: GET_SALES_AND_TRAFFIC_REPORT
 * Granularity: DAY (by date) + CHILD (by ASIN)
 */

// ── Marketplace config ────────────────────────────────────────────────────────

export const MARKETPLACES: Record<string, { id: string; endpoint: string; region: string; currency: string }> = {
  US: { id: "ATVPDKIKX0DER",  endpoint: "https://sellingpartnerapi-na.amazon.com", region: "NA", currency: "USD" },
  CA: { id: "A2EUQ1WTGCTBG2",  endpoint: "https://sellingpartnerapi-na.amazon.com", region: "NA", currency: "CAD" },
  MX: { id: "A1AM78C64UM0Y8",  endpoint: "https://sellingpartnerapi-na.amazon.com", region: "NA", currency: "MXN" },
  UK: { id: "A1F83G8C2ARO7P",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "GBP" },
  DE: { id: "A1PA6795UKMFR9",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "EUR" },
  FR: { id: "A13V1IB3VIYZZH",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "EUR" },
  IT: { id: "APJ6JRA9NG5V4",   endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "EUR" },
  ES: { id: "A1RKKUPIHCS9HS",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "EUR" },
  NL: { id: "A1805IZSGTT6HS",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "EUR" },
  PL: { id: "A1C3SOZRARQ6R3",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "PLN" },
  SE: { id: "A2NODRKZP88ZB9",  endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "EU", currency: "SEK" },
  JP: { id: "A1VC38T7YXB528",  endpoint: "https://sellingpartnerapi-fe.amazon.com", region: "FE", currency: "JPY" },
  AU: { id: "A39IBJ37TRP1C6",  endpoint: "https://sellingpartnerapi-fe.amazon.com", region: "FE", currency: "AUD" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SalesTrafficRow {
  date: string;
  parentAsin: string;
  childAsin: string;
  sales: number;
  totalOrderItems: number;
  unitsOrdered: number;
  buyBoxPct: number;
  pageViews: number;
  sessions: number;
}

export interface ReportStatus {
  reportId: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "FATAL" | "CANCELLED";
  reportDocumentId?: string;
  dataStartTime?: string;
  dataEndTime?: string;
  createdTime?: string;
}

interface LWATokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// ── Token management ──────────────────────────────────────────────────────────

// Simple in-memory cache (lives for the serverless function lifetime)
const tokenCache: { token: string; expiresAt: number } = { token: "", expiresAt: 0 };

export async function getLWAToken(): Promise<string> {
  const clientId     = process.env.AMZ_CLIENT_ID;
  const clientSecret = process.env.AMZ_CLIENT_SECRET;
  const refreshToken = process.env.AMZ_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Amazon credentials not configured (AMZ_CLIENT_ID / AMZ_CLIENT_SECRET / AMZ_REFRESH_TOKEN)");
  }

  // Return cached token if still valid (with 60s buffer)
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LWA token error ${res.status}: ${body}`);
  }

  const data: LWATokenResponse = await res.json();
  tokenCache.token     = data.access_token;
  tokenCache.expiresAt = Date.now() + data.expires_in * 1000;
  return data.access_token;
}

// ── Report helpers ────────────────────────────────────────────────────────────

function spHeaders(accessToken: string): HeadersInit {
  return {
    "x-amz-access-token": accessToken,
    "Content-Type": "application/json",
    "Accept":        "application/json",
  };
}

/**
 * Request a GET_SALES_AND_TRAFFIC_REPORT for a marketplace + date range.
 * Returns the reportId immediately (async processing).
 */
export async function createSalesTrafficReport(params: {
  marketplaceKey: string;   // e.g. "US", "DE"
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  asinGranularity?: "PARENT" | "CHILD" | "SKU";
}): Promise<string> {
  const { marketplaceKey, startDate, endDate, asinGranularity = "CHILD" } = params;
  const mkt = MARKETPLACES[marketplaceKey];
  if (!mkt) throw new Error(`Unknown marketplace: ${marketplaceKey}`);

  const accessToken = await getLWAToken();

  const body = {
    reportType:    "GET_SALES_AND_TRAFFIC_REPORT",
    marketplaceIds: [mkt.id],
    dataStartTime: `${startDate}T00:00:00Z`,
    dataEndTime:   `${endDate}T23:59:59Z`,
    reportOptions: {
      dateGranularity: "DAY",
      asinGranularity,
    },
  };

  const res = await fetch(`${mkt.endpoint}/reports/2021-06-30/reports`, {
    method: "POST",
    headers: spHeaders(accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create report error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.reportId as string;
}

/**
 * Get the current status of a report.
 */
export async function getReportStatus(params: {
  marketplaceKey: string;
  reportId: string;
}): Promise<ReportStatus> {
  const { marketplaceKey, reportId } = params;
  const mkt = MARKETPLACES[marketplaceKey];
  if (!mkt) throw new Error(`Unknown marketplace: ${marketplaceKey}`);

  const accessToken = await getLWAToken();
  const res = await fetch(`${mkt.endpoint}/reports/2021-06-30/reports/${reportId}`, {
    headers: spHeaders(accessToken),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Get report status error ${res.status}: ${txt}`);
  }

  return await res.json() as ReportStatus;
}

/**
 * Poll a report until DONE or FATAL, with exponential backoff.
 * Max wait: ~5 minutes. Returns the reportDocumentId when done.
 */
export async function pollUntilDone(params: {
  marketplaceKey: string;
  reportId: string;
  maxWaitMs?: number;
}): Promise<string> {
  const { marketplaceKey, reportId, maxWaitMs = 300_000 } = params;
  const start = Date.now();
  let delay = 5_000; // start at 5s

  while (Date.now() - start < maxWaitMs) {
    const status = await getReportStatus({ marketplaceKey, reportId });

    if (status.processingStatus === "DONE") {
      if (!status.reportDocumentId) throw new Error("Report DONE but no documentId");
      return status.reportDocumentId;
    }
    if (status.processingStatus === "FATAL" || status.processingStatus === "CANCELLED") {
      throw new Error(`Report ended with status: ${status.processingStatus}`);
    }

    // Still IN_QUEUE or IN_PROGRESS — wait and retry
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 30_000); // cap at 30s
  }

  throw new Error(`Report polling timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Download the report document and return its raw content.
 * The document URL is presigned S3 — no auth header needed.
 */
export async function downloadReportDocument(params: {
  marketplaceKey: string;
  documentId: string;
}): Promise<string> {
  const { marketplaceKey, documentId } = params;
  const mkt = MARKETPLACES[marketplaceKey];
  if (!mkt) throw new Error(`Unknown marketplace: ${marketplaceKey}`);

  const accessToken = await getLWAToken();

  // Step 1: get the download URL
  const metaRes = await fetch(`${mkt.endpoint}/reports/2021-06-30/documents/${documentId}`, {
    headers: spHeaders(accessToken),
  });
  if (!metaRes.ok) {
    const txt = await metaRes.text();
    throw new Error(`Get document meta error ${metaRes.status}: ${txt}`);
  }
  const meta = await metaRes.json() as { url: string; compressionAlgorithm?: string };

  // Step 2: download the actual file from S3
  const fileRes = await fetch(meta.url);
  if (!fileRes.ok) throw new Error(`Download from S3 error ${fileRes.status}`);

  // Decompress if gzipped
  if (meta.compressionAlgorithm === "GZIP") {
    const buffer = await fileRes.arrayBuffer();
    const { gunzipSync } = await import("zlib");
    const decompressed = gunzipSync(Buffer.from(buffer));
    return decompressed.toString("utf-8");
  }

  return await fileRes.text();
}

/**
 * Parse the JSON response from GET_SALES_AND_TRAFFIC_REPORT.
 * Returns flat rows in the format matching our Google Sheet.
 */
export function parseSalesTrafficReport(
  json: string,
  defaultDate: string,
): SalesTrafficRow[] {
  let report: {
    salesAndTrafficByAsin?: Array<{
      parentAsin?: string;
      childAsin?: string;
      salesByAsin?: {
        orderedProductSales?: { amount?: number };
        totalOrderItems?: number;
        unitsOrdered?: number;
      };
      trafficByAsin?: {
        buyBoxPercentage?: number;
        pageViews?: number;
        sessions?: number;
      };
    }>;
  };

  try {
    report = JSON.parse(json);
  } catch {
    throw new Error("Failed to parse SP-API report JSON");
  }

  const byAsin = report.salesAndTrafficByAsin || [];
  return byAsin.map((item) => ({
    date:            defaultDate,
    parentAsin:      item.parentAsin || "",
    childAsin:       item.childAsin  || item.parentAsin || "",
    sales:           item.salesByAsin?.orderedProductSales?.amount       ?? 0,
    totalOrderItems: item.salesByAsin?.totalOrderItems                   ?? 0,
    unitsOrdered:    item.salesByAsin?.unitsOrdered                      ?? 0,
    buyBoxPct:       item.trafficByAsin?.buyBoxPercentage                ?? 0,
    pageViews:       item.trafficByAsin?.pageViews                       ?? 0,
    sessions:        item.trafficByAsin?.sessions                        ?? 0,
  })).filter((r) => r.childAsin && (r.sales > 0 || r.sessions > 0));
}

// ── High-level: request + poll + download + parse ────────────────────────────

export async function fetchSalesTrafficReport(params: {
  marketplaceKey: string;
  startDate: string;
  endDate: string;
}): Promise<{ rows: SalesTrafficRow[]; reportId: string; documentId: string }> {
  const { marketplaceKey, startDate, endDate } = params;

  const reportId   = await createSalesTrafficReport({ marketplaceKey, startDate, endDate });
  const documentId = await pollUntilDone({ marketplaceKey, reportId });
  const content    = await downloadReportDocument({ marketplaceKey, documentId });
  const rows       = parseSalesTrafficReport(content, startDate);

  return { rows, reportId, documentId };
}
