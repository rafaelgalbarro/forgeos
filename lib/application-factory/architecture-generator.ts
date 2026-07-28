/** Program 4500 — System architecture generator. */

import type { Architecture, PRD } from "./types";

export function generateArchitecture(name: string, prd: PRD): Architecture {
  return {
    pattern: "modular-monolith",
    layers: [
      { name: "Presentación", technology: "Next.js App Router + React", responsibility: "UI, routing, SSR/CSR" },
      { name: "API", technology: "Next.js Route Handlers", responsibility: "REST endpoints, validación" },
      { name: "Dominio", technology: "TypeScript modules", responsibility: "Lógica de negocio, servicios" },
      { name: "Datos", technology: "Supabase (PostgreSQL)", responsibility: "Persistencia, RLS, auth" },
      { name: "Infra", technology: "Vercel + Supabase Cloud", responsibility: "Deploy, CDN, edge" },
    ],
    deployment: "Vercel (frontend/API) + Supabase (DB/auth/storage)",
    dataFlow: [
      `Cliente → Next.js → API Routes → Supabase (${name})`,
      "Auth: Supabase Auth JWT → middleware Next.js",
      "Realtime: Supabase subscriptions (opcional)",
    ],
    integrations: ["Supabase Auth", "Supabase Database", "Supabase Storage", "Resend (email stub)"],
  };
}

export function formatArchitectureSummary(arch: Architecture): string {
  return `${arch.pattern} · ${arch.layers.length} capas · ${arch.integrations.length} integraciones`;
}
