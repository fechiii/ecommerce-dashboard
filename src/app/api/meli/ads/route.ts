/**
 * GET /api/meli/ads?account=filhos&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/meli";
import { getAdsReport } from "@/lib/meliAds";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account") ?? "filhos";
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = searchParams.get("from") ?? new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);
  const dateTo   = searchParams.get("to")   ?? today;

  const account = getAccount(accountId);
  if (!account) {
    return NextResponse.json({ error: `Account '${accountId}' not found` }, { status: 404 });
  }

  if (!process.env.MELI_ADS_PRODUCT_ID) {
    return NextResponse.json({
      error: "not_configured",
      message: "MELI_ADS_PRODUCT_ID no está configurado. Obtené el product_id en developers.mercadolibre.com → tu app → Productos → Publicidad.",
    }, { status: 503 });
  }

  try {
    const data = await getAdsReport(account.sellerId, account.refreshToken, dateFrom, dateTo);
    return NextResponse.json({ accountId, period: { from: dateFrom, to: dateTo }, ...data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
