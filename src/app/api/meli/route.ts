/**
 * GET /api/meli?account=filhos&from=2024-01-01&to=2024-01-31
 * GET /api/meli?account=all&from=...&to=...   → todas las cuentas
 * GET /api/meli?status=1                       → solo chequeo de credenciales
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccounts, getAccount, getAccountMetrics, getSellerInfo } from "@/lib/meli";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountParam = searchParams.get("account") ?? "all";
  const statusOnly = searchParams.get("status") === "1";

  // ── Status check ────────────────────────────────────────────────────────────
  if (statusOnly) {
    const accounts = getAccounts();
    const results = await Promise.allSettled(
      accounts.map(async (acc) => {
        const info = await getSellerInfo(acc);
        return {
          id: acc.id,
          sellerId: acc.sellerId,
          nickname: info.nickname,
          reputation: info.seller_reputation?.level_id ?? "unknown",
          powerSeller: info.seller_reputation?.power_seller_status ?? null,
          transactions: info.seller_reputation?.transactions?.total ?? 0,
          connected: true,
        };
      })
    );
    return NextResponse.json({
      configured: accounts.length,
      accounts: results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { id: accounts[i].id, sellerId: accounts[i].sellerId, connected: false, error: (r.reason as Error).message }
      ),
    });
  }

  // ── Métricas ────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const dateFrom = searchParams.get("from") ?? thirtyDaysAgo;
  const dateTo   = searchParams.get("to")   ?? today;

  try {
    if (accountParam === "all") {
      const accounts = getAccounts();
      if (accounts.length === 0) {
        return NextResponse.json({ error: "No Meli accounts configured" }, { status: 400 });
      }
      const results = await Promise.allSettled(
        accounts.map((acc) => getAccountMetrics(acc, dateFrom, dateTo))
      );
      return NextResponse.json({
        period: { from: dateFrom, to: dateTo },
        accounts: results.map((r, i) =>
          r.status === "fulfilled"
            ? r.value
            : { accountId: accounts[i].id, error: (r.reason as Error).message }
        ),
      });
    }

    const account = getAccount(accountParam);
    if (!account) {
      return NextResponse.json({ error: `Account '${accountParam}' not found or not configured` }, { status: 404 });
    }
    const metrics = await getAccountMetrics(account, dateFrom, dateTo);
    return NextResponse.json(metrics);

  } catch (err: unknown) {
    console.error("[meli GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Meli API error" },
      { status: 500 }
    );
  }
}
