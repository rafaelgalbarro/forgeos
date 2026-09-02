import { NextResponse } from "next/server";
import { getOrders, isAlpacaConfigured } from "@/lib/brokers/alpaca-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/alpaca/orders — active Alpaca orders. */
export async function GET() {
  if (!isAlpacaConfigured()) {
    return NextResponse.json(
      { configured: false, orders: [], error: "Alpaca not configured" },
      { status: 503 },
    );
  }
  try {
    const orders = await getOrders("open");
    return NextResponse.json({
      configured: true,
      orders,
      count: orders.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        orders: [],
        error: error instanceof Error ? error.message : "Alpaca orders failed",
      },
      { status: 502 },
    );
  }
}
