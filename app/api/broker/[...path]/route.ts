import { NextRequest, NextResponse } from "next/server";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const servicePath = `/${path.join("/")}${request.nextUrl.search}`;
    const method = request.method;
    const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
    const result = await ibkrServiceFetch(servicePath, { method, body });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Broker service error" },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
