/** Program 4300 — Cloudflare DNS, SSL, WAF preparation (stub) */

import { getCloudflareZoneName } from "./config";
import type { CloudflareConfig } from "./types";

export function getCloudflareConfig(): CloudflareConfig {
  const zoneName = getCloudflareZoneName();

  return {
    zoneName,
    prepared: true,
    dnsRecords: [
      {
        type: "CNAME",
        name: "app",
        content: "cname.vercel-dns.com",
        proxied: true,
        ttl: 1,
      },
      {
        type: "CNAME",
        name: "staging",
        content: "cname.vercel-dns.com",
        proxied: true,
        ttl: 1,
      },
      {
        type: "TXT",
        name: "_forgeos",
        content: "v=forgeos-cloud-foundation-4300",
        proxied: false,
        ttl: 3600,
      },
    ],
    ssl: {
      mode: "full",
      minTlsVersion: "1.2",
      alwaysUseHttps: true,
    },
    wafRules: [
      {
        id: "waf-rate-limit",
        name: "Rate limit API",
        expression: '(http.request.uri.path contains "/api/")',
        action: "challenge",
        enabled: true,
      },
      {
        id: "waf-bot-protection",
        name: "Bot protection",
        expression: "(cf.client.bot)",
        action: "challenge",
        enabled: true,
      },
      {
        id: "waf-geo-block",
        name: "Geo block (disabled)",
        expression: "(ip.geoip.country eq \"XX\")",
        action: "block",
        enabled: false,
      },
    ],
  };
}

export function getCloudflareReadinessSummary(): string {
  const config = getCloudflareConfig();
  const enabledWaf = config.wafRules.filter((r) => r.enabled).length;
  return `${config.dnsRecords.length} registros DNS · SSL ${config.ssl.mode} · ${enabledWaf} reglas WAF activas`;
}
