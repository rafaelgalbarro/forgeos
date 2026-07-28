/** ForgeOS Real Connections — Cloudflare types (RC5). */

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

export interface CloudflareDNSRecord {
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
}
