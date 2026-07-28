import type { CloudflareSpec, InfraFactoryInput } from "./types";

export function generateCloudflareSpec(input: InfraFactoryInput): CloudflareSpec {
  const slug = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return {
    id: `cloudflare-${slug}`,
    adapter: "cloudflare",
    workers: [
      { pattern: `${slug}.example.com/api/*`, script: "api-gateway-worker" },
      { pattern: `${slug}.example.com/_next/static/*`, script: "static-cache-worker" },
    ],
    pagesProject: `${slug}-pages`,
    dnsRecords: [
      `A ${slug}.example.com -> proxied`,
      `CNAME www.${slug}.example.com -> ${slug}.example.com`,
    ],
    envKeys: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID"],
    cacheRules: ["Cache static assets for 1 year", "Bypass cache for /api/*"],
    wafRules: ["Rate limit /api/auth/*", "Block known bot patterns"],
  };
}
