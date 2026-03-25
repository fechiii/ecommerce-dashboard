import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const marketplace = searchParams.get("marketplace") || "US";

  // Amazon SP-API integration placeholder
  // Tokens are read from Master Sheet (Access tab)
  const refreshToken = process.env.AMZ_REFRESH_TOKEN;
  const clientId = process.env.AMZ_CLIENT_ID;
  const clientSecret = process.env.AMZ_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    return NextResponse.json({ error: "Amazon credentials not configured" }, { status: 400 });
  }

  try {
    // Step 1: Get LWA access token
    const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json();
    return NextResponse.json({ token_obtained: true, expires_in: tokenData.expires_in });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Failed to fetch Amazon data" }, { status: 500 });
  }
}
