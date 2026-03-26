/**
 * GET /api/amazon/status?reportId=XXX&marketplace=US
 * Returns the current processing status of a report.
 * Used to poll after creating a report via POST /api/amazon.
 */
import { NextRequest, NextResponse } from "next/server";
import { getReportStatus } from "@/lib/amazon";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reportId       = searchParams.get("reportId");
  const marketplaceKey = searchParams.get("marketplace") || "US";

  if (!reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  try {
    const status = await getReportStatus({ marketplaceKey, reportId });
    return NextResponse.json(status);
  } catch (err: unknown) {
    console.error("[amazon/status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get report status" },
      { status: 500 },
    );
  }
}
