/**
 * Mercado Libre Product Ads (PAds) API Client
 *
 * REQUIERE: MELI_ADS_PRODUCT_ID en variables de entorno
 * Cómo obtenerlo:
 *   1. developers.mercadolibre.com → tu app → Productos → Publicidad
 *   2. Copiar el "Product ID" asignado (ej: MLA123456)
 */

const MELI_BASE = "https://api.mercadolibre.com";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AdsCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "archived" | string;
  type: string;
  daily_budget: number;
  total_budget?: number;
  start_date?: string;
  end_date?: string;
}

export interface AdsAdGroup {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  default_bid: number;
}

export interface AdsAd {
  id: string;
  ad_group_id: string;
  campaign_id: string;
  campaign_name: string;
  item_id: string;
  item_title?: string;
  status: string;
  bid: number;
}

export interface AdsMetricRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  ad_id?: string;
  item_id?: string;
  item_title?: string;
  impressions: number;
  clicks: number;
  spend: number;
  attributed_sales: number;
  orders: number;
  ctr: number;       // clicks / impressions %
  cpc: number;       // spend / clicks
  acos: number;      // spend / attributed_sales %
  roas: number;      // attributed_sales / spend
}

export interface AdsSummary {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalSales: number;
  totalOrders: number;
  avgCTR: number;
  avgACOS: number;
  avgROAS: number;
  campaigns: AdsCampaign[];
  metricsTable: AdsMetricRow[];
  byDate: { date: string; spend: number; sales: number; clicks: number; impressions: number }[];
}

// ── Token cache ────────────────────────────────────────────────────────────────

const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

async function getMeliToken(sellerId: string, refreshToken: string): Promise<string> {
  const cached = tokenCache[sellerId];
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(`${MELI_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.MELI_APP_ID!,
      client_secret: process.env.MELI_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache[sellerId] = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function adsGet<T>(token: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${MELI_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`PAds API ${res.status} on ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Advertiser ID ─────────────────────────────────────────────────────────────

async function getAdvertiserId(token: string): Promise<string> {
  const productId = process.env.MELI_ADS_PRODUCT_ID;
  if (!productId) throw new Error("MELI_ADS_PRODUCT_ID no está configurado");

  const data = await adsGet<{ results: { id: string }[] }>(
    token, "/advertising/advertisers", { product_id: productId }
  );
  const id = data.results?.[0]?.id;
  if (!id) throw new Error("No se encontró advertiser asociado al producto");
  return id;
}

// ── Endpoints principales ──────────────────────────────────────────────────────

export async function getCampaigns(sellerId: string, refreshToken: string): Promise<AdsCampaign[]> {
  const token = await getMeliToken(sellerId, refreshToken);
  const advId = await getAdvertiserId(token);
  const data = await adsGet<{ results: AdsCampaign[] }>(
    token, `/advertising/advertisers/${advId}/campaigns`, { limit: "50" }
  );
  return data.results ?? [];
}

export async function getAds(sellerId: string, refreshToken: string): Promise<AdsAd[]> {
  const token = await getMeliToken(sellerId, refreshToken);
  const advId = await getAdvertiserId(token);

  // Primero obtenemos adgroups, luego ads
  const agData = await adsGet<{ results: AdsAdGroup[] }>(
    token, `/advertising/advertisers/${advId}/adgroups`, { limit: "50" }
  );
  const adgroups = agData.results ?? [];

  const allAds: AdsAd[] = [];
  for (const ag of adgroups.slice(0, 10)) {
    const adsData = await adsGet<{ results: AdsAd[] }>(
      token, `/advertising/advertisers/${advId}/adgroups/${ag.id}/ads`, { limit: "50" }
    );
    allAds.push(...(adsData.results ?? []).map((ad) => ({ ...ad, ad_group_id: ag.id })));
  }
  return allAds;
}

export async function getAdsReport(
  sellerId: string,
  refreshToken: string,
  dateFrom: string,
  dateTo: string,
): Promise<AdsSummary> {
  const token = await getMeliToken(sellerId, refreshToken);
  const advId = await getAdvertiserId(token);

  const [campaignsData, reportData] = await Promise.all([
    adsGet<{ results: AdsCampaign[] }>(token, `/advertising/advertisers/${advId}/campaigns`, { limit: "50" }),
    adsGet<{ results: AdsMetricRow[] }>(
      token,
      `/advertising/advertisers/${advId}/reports/campaigns`,
      { date_from: dateFrom, date_to: dateTo, group_by: "date,campaign", limit: "500" }
    ),
  ]);

  const campaigns = campaignsData.results ?? [];
  const rows = reportData.results ?? [];

  // Enrich rows with campaign name
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));
  const enriched = rows.map((r) => ({
    ...r,
    campaign_name: campaignMap[r.campaign_id] ?? r.campaign_id,
    ctr:  r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    cpc:  r.clicks > 0 ? r.spend / r.clicks : 0,
    acos: r.attributed_sales > 0 ? (r.spend / r.attributed_sales) * 100 : 0,
    roas: r.spend > 0 ? r.attributed_sales / r.spend : 0,
  }));

  // Aggregates
  const totalImpressions = enriched.reduce((s, r) => s + r.impressions, 0);
  const totalClicks      = enriched.reduce((s, r) => s + r.clicks, 0);
  const totalSpend       = enriched.reduce((s, r) => s + r.spend, 0);
  const totalSales       = enriched.reduce((s, r) => s + r.attributed_sales, 0);
  const totalOrders      = enriched.reduce((s, r) => s + r.orders, 0);

  // By date
  const byDateMap: Record<string, { spend: number; sales: number; clicks: number; impressions: number }> = {};
  enriched.forEach((r) => {
    if (!byDateMap[r.date]) byDateMap[r.date] = { spend: 0, sales: 0, clicks: 0, impressions: 0 };
    byDateMap[r.date].spend       += r.spend;
    byDateMap[r.date].sales       += r.attributed_sales;
    byDateMap[r.date].clicks      += r.clicks;
    byDateMap[r.date].impressions += r.impressions;
  });
  const byDate = Object.entries(byDateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    totalImpressions,
    totalClicks,
    totalSpend,
    totalSales,
    totalOrders,
    avgCTR:  totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avgACOS: totalSales > 0 ? (totalSpend / totalSales) * 100 : 0,
    avgROAS: totalSpend > 0 ? totalSales / totalSpend : 0,
    campaigns,
    metricsTable: enriched,
    byDate,
  };
}
