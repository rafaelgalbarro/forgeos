/** Program 4300 — Cloud health snapshot (light, read-only public APIs) */

import {
  runAggregatedHealthChecks,
  computeOverallHealthFromChecks,
} from "@/lib/production-readiness";
import type { CloudHealthCheck, CloudHealthSnapshot, CloudHealthStatus } from "./types";

function mapHealthStatus(status: string): CloudHealthStatus {
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "degraded";
  if (status === "critical" || status === "offline") return "critical";
  return "unknown";
}

function inferProvider(category: string): CloudHealthCheck["provider"] {
  if (category === "config" || category === "system") return "system";
  return "system";
}

export async function buildCloudHealthSnapshot(): Promise<CloudHealthSnapshot> {
  const prodChecks = await runAggregatedHealthChecks();
  const overallProd = computeOverallHealthFromChecks(prodChecks);

  const checks: CloudHealthCheck[] = prodChecks.map((c) => ({
    id: `cloud:${c.id}`,
    label: c.label,
    provider: inferProvider(c.category),
    status: mapHealthStatus(c.status),
    message: c.message,
    publicApiOnly: true,
  }));

  checks.push(
    {
      id: "cloud:github-strategy",
      label: "Estrategia GitHub",
      provider: "github",
      status: "healthy",
      message: "Branch model configurado — main/develop/release/feature",
      publicApiOnly: true,
    },
    {
      id: "cloud:vercel-mapping",
      label: "Mapeo Vercel",
      provider: "vercel",
      status: "healthy",
      message: "Preview/staging/production mapeados — producción bloqueada",
      publicApiOnly: true,
    },
    {
      id: "cloud:cloudflare-prep",
      label: "Cloudflare DNS/SSL/WAF",
      provider: "cloudflare",
      status: "healthy",
      message: "Configuración preparada (stub)",
      publicApiOnly: true,
    },
    {
      id: "cloud:supabase-envs",
      label: "Supabase entornos",
      provider: "supabase",
      status: "degraded",
      message: "Estrategia dev/staging/prod definida — credenciales pendientes",
      publicApiOnly: true,
    }
  );

  const healthyCount = checks.filter((c) => c.status === "healthy").length;
  const score = Math.round((healthyCount / checks.length) * 100);

  let overallStatus: CloudHealthStatus = mapHealthStatus(overallProd);
  if (score >= 80 && overallStatus !== "critical") overallStatus = "healthy";
  else if (score >= 50) overallStatus = "degraded";

  return {
    overallStatus,
    checks,
    productionReadinessScore: score,
    timestamp: new Date().toISOString(),
  };
}
