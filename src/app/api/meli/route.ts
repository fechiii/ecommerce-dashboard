import { NextRequest, NextResponse } from "next/server";

const MELI_BASE = "https://api.mercadolibre.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "me";
  const accessToken = process.env.MELI_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: "No MELI_ACCESS_TOKEN configured" }, { status: 400 });
  }

  try {
    const res = await fetch(`${MELI_BASE}/${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: "Failed to fetch Meli data" }, { status: 500 });
  }
}
