/**
 * Mercado Libre API Client
 * Soporta múltiples cuentas (UGO, FILHOS) con refresh automático de tokens
 */

const MELI_BASE = "https://api.mercadolibre.com";

// ── Configuración de cuentas ──────────────────────────────────────────────────

export interface MeliAccount {
  id: string;
  sellerId: string;
  refreshToken: string;
}

export function getAccounts(): MeliAccount[] {
  const accounts: MeliAccount[] = [];

  if (process.env.FILHOS_SELLER_ID && process.env.FILHOS_REFRESH_TOKEN) {
    accounts.push({
      id: "filhos",
      sellerId: process.env.FILHOS_SELLER_ID,
      refreshToken: process.env.FILHOS_REFRESH_TOKEN,
    });
  }
  if (process.env.UGO_SELLER_ID && process.env.UGO_REFRESH_TOKEN) {
    accounts.push({
      id: "ugo",
      sellerId: process.env.UGO_SELLER_ID,
      refreshToken: process.env.UGO_REFRESH_TOKEN,
    });
  }
  return accounts;
}

export function getAccount(id: string): MeliAccount | null {
  return getAccounts().find((a) => a.id === id) ?? null;
}

// ── Token cache (in-memory, por cuenta) ──────────────────────────────────────

const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

export async function getMeliToken(account: MeliAccount): Promise<string> {
  const cached = tokenCache[account.id];
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(`${MELI_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.MELI_APP_ID!,
      client_secret: process.env.MELI_CLIENT_SECRET!,
      refresh_token: account.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meli token refresh failed for ${account.id}: ${err}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache[account.id] = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

// ── Helper fetch autenticado ──────────────────────────────────────────────────

async function meliGet<T>(account: MeliAccount, path: string, params?: Record<string, string>): Promise<T> {
  const token = await getMeliToken(account);
  const url = new URL(`${MELI_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Meli API error ${res.status} on ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SellerInfo {
  id: number;
  nickname: string;
  points: number;
  site_id: string;
  permalink: string;
  seller_reputation: {
    level_id: string;
    power_seller_status: string;
    transactions: { completed: number; canceled: number; total: number };
  };
}

export interface MeliOrder {
  id: number;
  status: string;
  date_created: string;
  date_closed: string;
  total_amount: number;
  currency_id: string;
  order_items: {
    item: { id: string; title: string };
    quantity: number;
    unit_price: number;
  }[];
  buyer: { id: number; nickname: string };
}

export interface MeliItem {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  thumbnail: string;
  permalink: string;
  currency_id: string;
}

export interface MeliQuestion {
  id: number;
  text: string;
  status: string;
  date_created: string;
  item_id: string;
  item_title?: string;
  from: { id: number; answered_questions?: number };
  answer?: { text: string; date_created: string };
}

export interface MeliVisit {
  date: string;
  total: number;
}

export interface MeliMetrics {
  sellerId: string;
  accountId: string;
  period: { from: string; to: string };
  totalSales: number;
  totalOrders: number;
  canceledOrders: number;
  totalUnits: number;
  currency: string;
  salesByDate: { date: string; sales: number; orders: number }[];
  topItems: { id: string; title: string; units: number; sales: number }[];
  pendingQuestions: number;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export async function getSellerInfo(account: MeliAccount): Promise<SellerInfo> {
  return meliGet<SellerInfo>(account, `/users/${account.sellerId}`);
}

export async function getOrders(
  account: MeliAccount,
  dateFrom: string,
  dateTo: string,
  limit = 50,
  offset = 0,
): Promise<{ results: MeliOrder[]; paging: { total: number; offset: number; limit: number } }> {
  return meliGet(account, `/orders/search`, {
    seller: account.sellerId,
    "order.date_created.from": `${dateFrom}T00:00:00.000-00:00`,
    "order.date_created.to": `${dateTo}T23:59:59.999-00:00`,
    sort: "date_desc",
    limit: String(limit),
    offset: String(offset),
  });
}

export async function getActiveItems(account: MeliAccount, limit = 50, offset = 0): Promise<{
  results: string[];
  paging: { total: number };
}> {
  return meliGet(account, `/users/${account.sellerId}/items/search`, {
    status: "active",
    limit: String(limit),
    offset: String(offset),
  });
}

export async function getItemDetails(account: MeliAccount, itemIds: string[]): Promise<MeliItem[]> {
  if (itemIds.length === 0) return [];
  const token = await getMeliToken(account);
  const ids = itemIds.slice(0, 20).join(",");
  const res = await fetch(`${MELI_BASE}/items?ids=${ids}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json() as { code: number; body: MeliItem }[];
  return data.filter((d) => d.code === 200).map((d) => d.body);
}

export async function getPendingQuestions(account: MeliAccount, limit = 20): Promise<{
  total: number;
  questions: MeliQuestion[];
}> {
  const data = await meliGet<{ total: number; questions: MeliQuestion[] }>(
    account,
    `/my/received_questions/search`,
    { status: "UNANSWERED", limit: String(limit) },
  );
  return data;
}

export async function getAllQuestions(account: MeliAccount, limit = 20): Promise<{
  total: number;
  questions: MeliQuestion[];
}> {
  return meliGet<{ total: number; questions: MeliQuestion[] }>(
    account,
    `/my/received_questions/search`,
    { limit: String(limit), sort_fields: "date_created", sort_types: "DESC" },
  );
}

export async function answerQuestion(
  account: MeliAccount,
  questionId: number,
  text: string,
): Promise<{ id: number; status: string }> {
  const token = await getMeliToken(account);
  const res = await fetch(`${MELI_BASE}/answers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question_id: questionId, text }),
  });
  if (!res.ok) throw new Error(`Answer failed: ${await res.text()}`);
  return res.json() as Promise<{ id: number; status: string }>;
}

// ── Métricas consolidadas ─────────────────────────────────────────────────────

export async function getAccountMetrics(
  account: MeliAccount,
  dateFrom: string,
  dateTo: string,
): Promise<MeliMetrics> {
  // Paginación inteligente: máximo 300 órdenes (6 páginas)
  // Para vendedores de alto volumen es suficiente para métricas de tendencia
  const allOrders: MeliOrder[] = [];
  let offset = 0;
  const limit = 50;
  const MAX_ORDERS = 300;

  while (true) {
    const page = await getOrders(account, dateFrom, dateTo, limit, offset);
    allOrders.push(...page.results);
    if (
      allOrders.length >= page.paging.total ||
      page.results.length < limit ||
      allOrders.length >= MAX_ORDERS
    ) break;
    offset += limit;
  }

  // Consolidar métricas
  const paid = allOrders.filter((o) => o.status === "paid");
  const canceled = allOrders.filter((o) => o.status === "cancelled").length;
  const totalSales = paid.reduce((sum, o) => sum + o.total_amount, 0);
  const totalUnits = paid.reduce((sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0), 0);
  const currency = paid[0]?.currency_id ?? "ARS";

  // Ventas por fecha
  const byDate: Record<string, { sales: number; orders: number }> = {};
  paid.forEach((o) => {
    const d = o.date_created.slice(0, 10);
    if (!byDate[d]) byDate[d] = { sales: 0, orders: 0 };
    byDate[d].sales += o.total_amount;
    byDate[d].orders += 1;
  });
  const salesByDate = Object.entries(byDate)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top items
  const byItem: Record<string, { title: string; units: number; sales: number }> = {};
  paid.forEach((o) => {
    o.order_items.forEach((item) => {
      const key = item.item.id;
      if (!byItem[key]) byItem[key] = { title: item.item.title, units: 0, sales: 0 };
      byItem[key].units += item.quantity;
      byItem[key].sales += item.unit_price * item.quantity;
    });
  });
  const topItems = Object.entries(byItem)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  // Preguntas pendientes
  let pendingQuestions = 0;
  try {
    const q = await getPendingQuestions(account);
    pendingQuestions = q.total;
  } catch {
    // no es crítico
  }

  return {
    sellerId: account.sellerId,
    accountId: account.id,
    period: { from: dateFrom, to: dateTo },
    totalSales,
    totalOrders: paid.length,
    canceledOrders: canceled,
    totalUnits,
    currency,
    salesByDate,
    topItems,
    pendingQuestions,
  };
}
