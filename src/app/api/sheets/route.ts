import { NextRequest, NextResponse } from "next/server";
import { getSalesTrafficUS, getSalesTrafficEU, getQueryLog } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "us";

  try {
    if (tab === "us") {
      const data = await getSalesTrafficUS();
      return NextResponse.json({ data });
    } else if (tab === "eu") {
      const data = await getSalesTrafficEU();
      return NextResponse.json({ data });
    } else if (tab === "queries") {
      const data = await getQueryLog();
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch sheet data" }, { status: 500 });
  }
}
