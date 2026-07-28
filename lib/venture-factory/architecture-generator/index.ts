/** Architecture generator — dry-run */

import type { IdeaProfile } from "../idea-context";
import type { ArchitecturePlan } from "../types";

export function generateArchitecture(profile: IdeaProfile): ArchitecturePlan {
  if (profile.isPremiumGlasses) {
    return {
      stack: ["Next.js 15", "TypeScript", "Postgres (Supabase)", "Stripe", "Vercel", "Cloudinary"],
      services: ["Web storefront", "Admin API", "Order service", "Media CDN"],
      integrations: ["Stripe Payments", "SendGrid email", "Shippo logistics"],
      security: ["HTTPS", "RLS Supabase", "PCI via Stripe", "CSP headers"],
      diagram: "Browser → Next.js (RSC) → API Routes → Postgres | Stripe Webhooks → Order updates",
    };
  }

  return {
    stack: ["Next.js 15", "TypeScript", "Postgres", "Vercel"],
    services: ["Web app", "REST API", "Auth service"],
    integrations: ["Stripe", "Email provider"],
    security: ["HTTPS", "JWT sessions", "Rate limiting"],
    diagram: "Client → Next.js → API → Database",
  };
}
