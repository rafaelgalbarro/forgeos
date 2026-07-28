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

  const { provider, ventureId, requestedBy } = body as {
    provider?: string;
    ventureId?: string;
    requestedBy?: string;
  };

  if (!provider || !VALID_PROVIDERS.includes(provider as ConnectionProvider)) {
    return NextResponse.json({ error: "Valid provider is required" }, { status: 400 });
  }

  const vid = ventureId ?? "demo-venture-vandl";
  const by = requestedBy ?? "cto";

  try {
    const [
      { githubAdapter },
      { supabaseAdapter },
      { vercelAdapter },
      { cloudflareAdapter },
      { checkAllProviderHealth },
    ] = await Promise.all([
      import("@/lib/connections/github/adapter"),
      import("@/lib/connections/supabase/adapter"),
      import("@/lib/connections/vercel/adapter"),
      import("@/lib/connections/cloudflare/adapter"),
      import("@/lib/connections/security/connection-health"),
    ]);

    const adapters = {
      github: githubAdapter,
      supabase: supabaseAdapter,
      vercel: vercelAdapter,
      cloudflare: cloudflareAdapter,
    } as const;

    const adapter = adapters[provider as ConnectionProvider];
    const result = await adapter.run("validate", { ventureId: vid, requestedBy: by, mode: "dry_run" });
    const health = await checkAllProviderHealth();
    return NextResponse.json(redactObject({ result, health }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
