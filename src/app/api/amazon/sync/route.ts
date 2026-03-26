/**
 * POST /api/amazon/sync
 * Full pipeline: Create report → Poll → Download → Parse → Write to Google Sheet
 *
 * Body: {
 *   marketplaceKey: "US" | "DE" | "UK" | "ES" | "IT" | "FR" | ...
 *   startDate: "YYYY-MM-DD"
 *   endDate:   "YYYY-MM-DD"
 * }
 *
 * Because report processing can take 1–10 min, this endpoint uses a
 * two-step flow to avoid Vercel's 60s timeout:
 *
 *   Step 1 (action: "create"):  Creates the report → returns { reportId }
 *   Step 2 (action: "download"): Given reportId, polls status once and if
 *                                 DONE downloads + writes to Sheet.
 *
 * The frontend polls step 2 every ~15s until status = "written".
 *
 * GET /api/amazon/sync  → list last sync entries from U1_queries tab
 */
import { NextRequest, NextResponse } from "next/server";
import {
  MARKETPLACES,
  createSalesTrafficReport,
  getReportStatus,
  downloadReportDocument,
  parseSalesTrafficReport,
} from "@/lib/amazon";
import { appendSalesTrafficRows, logSyncEvent, getQueryLog } from "@/lib/sheets";

// ── GET: last sync log ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const log = await getQueryLog();
    return NextResponse.json({ log: log.slice(-50).reverse() }); // newest first
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load sync log" },
      { status: 500 },
    );
  }
}

// ── POST: sync pipeline ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action?: "create" | "download";
      marketplaceKey?: string;
      startDate?: string;
      endDate?: string;
      reportId?: string;
    };

    const {
      action        = "create",
      marketplaceKey = "US",
      startDate,
      endDate,
      reportId,
    } = body;

    const mkt = MARKETPLACES[marketplaceKey];
    if (!mkt) {
      return NextResponse.json({ error: `Unknown marketplace: ${marketplaceKey}` }, { status: 400 });
    }

    // ── Step 1: create report ─────────────────────────────────────────────────
    if (action === "create") {
      if (!startDate || !endDate) {
        return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
      }

      const newReportId = await createSalesTrafficReport({ marketplaceKey, startDate, endDate });

      return NextResponse.json({
        action:   "created",
        reportId: newReportId,
        marketplaceKey,
        startDate,
        endDate,
        message:  'Poll with action:"download" and this reportId every ~15s',
      });
    }

    // ── Step 2: poll status → download → write ────────────────────────────────
    if (action === "download") {
      if (!reportId) {
        return NextResponse.json({ error: "reportId required for action:download" }, { status: 400 });
      }

      const status = await getReportStatus({ marketplaceKey, reportId });

      if (status.processingStatus === "IN_QUEUE" || status.processingStatus === "IN_PROGRESS") {
        return NextResponse.json({
          action:  "pending",
          reportId,
          processingStatus: status.processingStatus,
          message: "Report still processing. Try again in 15s.",
        });
      }

      if (status.processingStatus === "FATAL" || status.processingStatus === "CANCELLED") {
        await logSyncEvent({
          runDate:       new Date().toISOString(),
          region:        mkt.region,
          marketplace:   marketplaceKey,
          marketplaceId: mkt.id,
          reportType:    "GET_SALES_AND_TRAFFIC_REPORT",
          granularity:   "DAY/CHILD",
          dataStart:     startDate || "",
          dataEnd:       endDate   || "",
          status:        `FAILED: ${status.processingStatus}`,
        });
        return NextResponse.json({ error: `Report failed: ${status.processingStatus}` }, { status: 500 });
      }

      // DONE — download and write
      const documentId = status.reportDocumentId!;
      const content    = await downloadReportDocument({ marketplaceKey, documentId });

      const dataStart = status.dataStartTime?.slice(0, 10) || startDate || "";
      const dataEnd   = status.dataEndTime?.slice(0, 10)   || endDate   || "";

      const rows = parseSalesTrafficReport(content, dataStart);

      // Determine which tab to write to
      const tabName: "Sales & Traffic - US" | "Sales & Traffic - EU" =
        mkt.region === "NA" ? "Sales & Traffic - US" : "Sales & Traffic - EU";

      const { appended, skipped } = await appendSalesTrafficRows(tabName, rows);

      // Log to U1_queries
      await logSyncEvent({
        runDate:       new Date().toISOString(),
        region:        mkt.region,
        marketplace:   marketplaceKey,
        marketplaceId: mkt.id,
        reportType:    "GET_SALES_AND_TRAFFIC_REPORT",
        granularity:   "DAY/CHILD",
        dataStart,
        dataEnd,
        status:        `OK: ${appended} appended, ${skipped} skipped`,
      });

      return NextResponse.json({
        action:     "written",
        marketplaceKey,
        tab:        tabName,
        rows:       rows.length,
        appended,
        skipped,
        dataStart,
        dataEnd,
        documentId,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("[amazon/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
