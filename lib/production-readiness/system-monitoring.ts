/** Program 6500 — System health snapshot */

import type { HealthStatus, SystemCheck, SystemHealthSnapshot } from "./types";
import { isProductionMonitoringEnabled } from "./config";

function checkStatus(ok: boolean, warn = false): HealthStatus {
  if (!ok) return warn ? "degraded" : "critical";
  return "healthy";
}

export function buildSystemHealthSnapshot(): SystemHealthSnapshot {
  const start = Date.now();
  const checks: SystemCheck[] = [];

  const monitoring = isProductionMonitoringEnabled();
  checks.push({
    id: "monitoring",
    label: "Monitoreo de producción",
    status: monitoring ? "healthy" : "degraded",
    message: monitoring ? "Activo" : "Deshabilitado por env",
  });

  const nodeVersion = typeof process !== "undefined" ? process.version : "unknown";
  checks.push({
    id: "node",
    label: "Node.js",
    status: nodeVersion.startsWith("v") ? "healthy" : "unknown",
    message: nodeVersion,
  });

  let memoryUsageMb = 0;
  if (typeof process !== "undefined" && process.memoryUsage) {
    memoryUsageMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    checks.push({
      id: "memory",
      label: "Memoria heap",
      status: memoryUsageMb < 512 ? "healthy" : memoryUsageMb < 1024 ? "degraded" : "critical",
      message: `${memoryUsageMb} MB`,
    });
  }

  const platform = typeof process !== "undefined" ? process.platform : "browser";
  checks.push({
    id: "platform",
    label: "Plataforma",
    status: "healthy",
    message: platform,
  });

  const worst = checks.reduce<HealthStatus>((acc, c) => {
    const order: HealthStatus[] = ["offline", "critical", "degraded", "unknown", "healthy"];
    return order.indexOf(c.status) < order.indexOf(acc) ? c.status : acc;
  }, "healthy");

  return {
    status: worst,
    uptimeMs: typeof process !== "undefined" ? Math.round(process.uptime?.() * 1000) || 0 : 0,
    nodeVersion,
    platform,
    memoryUsageMb,
    timestamp: new Date().toISOString(),
    checks,
  };
}

export async function probeExternalHealthEndpoint(url?: string): Promise<SystemCheck | null> {
  if (!url || typeof fetch === "undefined") return null;
  const start = Date.now();
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
    return {
      id: "external-health",
      label: "Endpoint de salud externo",
      status: res.ok ? "healthy" : "degraded",
      message: `HTTP ${res.status} (${Date.now() - start}ms)`,
    };
  } catch (err) {
    return {
      id: "external-health",
      label: "Endpoint de salud externo",
      status: "critical",
      message: err instanceof Error ? err.message : "Probe failed",
    };
  }
}
