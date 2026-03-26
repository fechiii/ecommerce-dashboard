/**
 * GET  /api/amazon          → Credential status + configured marketplaces
 * POST /api/amazon          → Create a Sales & Traffic report (async)
 */
import { NextRequest, NextResponse } from "next/server";
import { getLWAToken, MARKETPLACES, createSalesTrafficReport } from "@/lib/amazon";

// ── GET: status check ─────────────────────────────────────────────────────────
export async function GET() {
  const hasClientId     = !!process.env.AMZ_CLIENT_ID;
  const hasClientSecret = !!process.env.AMZ_CLIENT_SECRET;
  const hasRefreshToken = !!process.env.AMZ_REFRESH_TOKEN;
  const configured      = hasClientId && hasClientSecret && hasRefreshToken;

  let tokenStatus: "ok" | "error" | "not_configured" = "not_configured";
  let tokenError: string | null = null;

  if (configured) {
    try {
      await getLWAToken();
      tokenStatus = "ok";
    } catch (e: unknown) {
      tokenStatus = "error";
      tokenError  = e instanceof Error ? e.message : "Unknown error";
    }
  }

  return NextResponse.json({
    configured,
    credentials: {
      clientId:     hasClientId     ? "✓ set" : "✗ missing",
      clientSecret: hasClientSecret ? "✓ set" : "✗ missing",
      refreshToken: hasRefreshToken ? "✓ set" : "✗ missing",
    },
    tokenStatus,
    tokenError,
    marketplaces: Object.entries(MARKETPLACES).map(([key, m]) => ({
      key,
      id:       m.id,
      region:   m.region,
      currency: m.currency,
    })),
  });
}

// ── POST: create report ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      marketplaceKey?: string;
      startDate?: string;
      endDate?: string;
    };

    const { marketplaceKey = "US", startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required (YYYY-MM-DD)" }, { status: 400 });
    }

    if (!MARKETPLACES[marketplaceKey]) {
      return NextResponse.json({ error: `Unknown marketplace: ${marketplaceKey}` }, { status: 400 });
    }

    const reportId = await createSalesTrafficReport({ marketplaceKey, startDate, endDate });

    return NextResponse.json({
      reportId,
      marketplaceKey,
      startDate,
      endDate,
      message: "Report created. Poll /api/amazon/status?reportId=...&marketplace=... to check progress.",
    });
  } catch (err: unknown) {
    console.error("[amazon POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create report" },
      { status: 500 },
    );
  }
}
