import { NextResponse } from "next/server";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import type { ConnectionProvider } from "@/lib/connections/shared/types";

const VALID_PROVIDERS: ConnectionProvider[] = ["github", "supabase", "vercel", "cloudflare"];

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, operation, ventureId, requestedBy, payload } = body as {
    provider?: string;
    operation?: string;
    ventureId?: string;
    requestedBy?: string;
    payload?: Record<string, unknown>;
  };

  if (!provider || !VALID_PROVIDERS.includes(provider as ConnectionProvider)) {
    return NextResponse.json({ error: "Valid provider is required" }, { status: 400 });
  }
  if (!operation?.trim()) {
    return NextResponse.json({ error: "operation is required" }, { status: 400 });
  }

  try {
    const [
      { githubAdapter },
      { supabaseAdapter },
      { vercelAdapter },
      { cloudflareAdapter },
    ] = await Promise.all([
      import("@/lib/connections/github/adapter"),
      import("@/lib/connections/supabase/adapter"),
      import("@/lib/connections/vercel/adapter"),
      import("@/lib/connections/cloudflare/adapter"),
    ]);

    const adapters = {
      github: githubAdapter,
      supabase: supabaseAdapter,
      vercel: vercelAdapter,
      cloudflare: cloudflareAdapter,
    } as const;

    const adapter = adapters[provider as ConnectionProvider];
    const result = await adapter.run(operation.trim(), {
      ventureId: ventureId ?? "demo-venture-vandl",
      requestedBy: requestedBy ?? "cto",
      mode: "dry_run",
      payload,
    });
    return NextResponse.json(redactObject({ result }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dry-run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
