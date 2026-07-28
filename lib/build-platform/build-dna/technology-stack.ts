/** Default technology stack for ForgeOS ventures (Epic 6.1). */

import type { TechnologyStack } from "./types";

export const DEFAULT_TECHNOLOGY_STACK: TechnologyStack = {
  framework: "Next.js 15 (App Router)",
  backend: "Next.js Route Handlers + Server Actions",
  frontend: "React 19 + FHIS Design System",
  database: "PostgreSQL (Supabase)",
  auth: "Supabase Auth (OAuth + magic link)",
  payments: "Stripe",
  email: "Resend",
  analytics: "PostHog",
  testing: "Vitest + Playwright",
  cicd: "GitHub Actions",
  deployment: "Vercel",
  monitoring: "Sentry + Vercel Analytics",
};
