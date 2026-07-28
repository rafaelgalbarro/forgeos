/** PROGRAM 5390 — Shared source of truth for all outputs. */

import type { MissionSession } from "@/lib/mission-control/types";

export interface DesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  spacing: Record<string, string>;
}

export interface BrandIdentity {
  name: string;
  tagline: string;
  tone: string;
  logoConcept: string;
  tokens: DesignTokens;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
}

export interface PricingModel {
  model: string;
  currency: string;
  tiers: PricingTier[];
}

export interface UserRole {
  id: string;
  label: string;
  permissions: string[];
}

export interface BusinessEntity {
  name: string;
  fields: string[];
  relations?: string[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  requestSchema?: string;
  responseSchema?: string;
}

export interface ApiContract {
  baseUrl: string;
  version: string;
  auth: string;
  endpoints: ApiEndpoint[];
  errorCodes: { code: string; message: string }[];
  pagination: { style: string; defaultLimit: number };
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  properties: string[];
  trigger: string;
}

export interface LegalDocument {
  type: "privacy" | "terms" | "cookies";
  summary: string;
  lastUpdated: string;
}

export interface EnvironmentConfig {
  name: string;
  variables: { key: string; description: string; secret: boolean }[];
}

export interface SharedContext {
  contextId: string;
  missionId: string;
  version: string;
  companyIdentity: {
    name: string;
    valueProposition: string;
    icp: string;
    market: string;
    businessModel: string;
  };
  brand: BrandIdentity;
  pricing: PricingModel;
  users: UserRole[];
  entities: BusinessEntity[];
  apiContract: ApiContract;
  businessRules: string[];
  analyticsEvents: AnalyticsEvent[];
  legal: LegalDocument[];
  environment: EnvironmentConfig;
  updatedAt: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join("-");
}

export function buildSharedContextFromSession(session: MissionSession): SharedContext {
  const idea = session.intent?.extractedIdea ?? "Misión ForgeOS";
  const name = idea.slice(0, 40).trim() || "Venture Demo";
  const slug = session.ventureSlug ?? slugify(name);
  const now = new Date().toISOString();

  return {
    contextId: `ctx-${session.missionId}`,
    missionId: session.missionId,
    version: "0.1.0",
    companyIdentity: {
      name,
      valueProposition: idea,
      icp: "Cliente objetivo B2B",
      market: "España / EU",
      businessModel: "Suscripción SaaS",
    },
    brand: {
      name,
      tagline: `${name} — construido con ForgeOS`,
      tone: "Profesional, directo, confiable",
      logoConcept: "Monograma geométrico",
      tokens: {
        primaryColor: "#2563eb",
        secondaryColor: "#64748b",
        accentColor: "#0ea5e9",
        fontFamily: "Inter, system-ui, sans-serif",
        borderRadius: "8px",
        spacing: { sm: "4px", md: "8px", lg: "16px", xl: "24px" },
      },
    },
    pricing: {
      model: "subscription",
      currency: "EUR",
      tiers: [
        { id: "starter", name: "Starter", price: "49", period: "mes", features: ["5 usuarios", "Soporte email"] },
        { id: "pro", name: "Pro", price: "149", period: "mes", features: ["25 usuarios", "API access", "Integraciones"] },
        { id: "enterprise", name: "Enterprise", price: "Custom", period: "año", features: ["Ilimitado", "SLA", "On-premise"] },
      ],
    },
    users: [
      { id: "admin", label: "Administrador", permissions: ["*"] },
      { id: "manager", label: "Manager", permissions: ["read", "write", "approve"] },
      { id: "operator", label: "Operador", permissions: ["read", "write"] },
      { id: "viewer", label: "Viewer", permissions: ["read"] },
    ],
    entities: [
      { name: "User", fields: ["id", "email", "role", "createdAt"], relations: ["Organization"] },
      { name: "Organization", fields: ["id", "name", "plan", "createdAt"] },
      { name: "Task", fields: ["id", "title", "status", "assigneeId", "dueAt"] },
    ],
    apiContract: {
      baseUrl: `/api/v1/${slug}`,
      version: "v1",
      auth: "Bearer JWT",
      endpoints: [
        { method: "GET", path: "/health", description: "Health check", auth: false },
        { method: "GET", path: "/users", description: "List users", auth: true },
        { method: "POST", path: "/users", description: "Create user", auth: true },
        { method: "GET", path: "/tasks", description: "List tasks", auth: true },
        { method: "POST", path: "/tasks", description: "Create task", auth: true },
      ],
      errorCodes: [
        { code: "UNAUTHORIZED", message: "Token inválido o expirado" },
        { code: "NOT_FOUND", message: "Recurso no encontrado" },
        { code: "VALIDATION_ERROR", message: "Datos de entrada inválidos" },
      ],
      pagination: { style: "cursor", defaultLimit: 20 },
    },
    businessRules: [
      "Solo admins pueden eliminar usuarios",
      "Tasks vencidas generan alerta automática",
      "Pricing tier determina límite de usuarios",
    ],
    analyticsEvents: [
      { id: "signup", name: "user_signup", properties: ["plan", "source"], trigger: "Registro completado" },
      { id: "task_created", name: "task_created", properties: ["assignee", "priority"], trigger: "Nueva tarea" },
    ],
    legal: [
      { type: "privacy", summary: "Política de privacidad GDPR-compliant", lastUpdated: now },
      { type: "terms", summary: "Términos de servicio SaaS", lastUpdated: now },
    ],
    environment: {
      name: "preview",
      variables: [
        { key: "DATABASE_URL", description: "PostgreSQL connection", secret: true },
        { key: "JWT_SECRET", description: "Auth secret", secret: true },
        { key: "NEXT_PUBLIC_API_URL", description: "API base URL", secret: false },
      ],
    },
    updatedAt: now,
  };
}

/** Export design token package — NO ForgeOS FHIS imports in generated code */
export function exportDesignTokenPackage(ctx: SharedContext): Record<string, string> {
  const { tokens, name, tagline } = ctx.brand;
  return {
    "tokens/colors.json": JSON.stringify(
      { primary: tokens.primaryColor, secondary: tokens.secondaryColor, accent: tokens.accentColor },
      null,
      2
    ),
    "tokens/typography.json": JSON.stringify({ fontFamily: tokens.fontFamily }, null, 2),
    "tokens/spacing.json": JSON.stringify(tokens.spacing, null, 2),
    "brand/meta.json": JSON.stringify({ name, tagline, tone: ctx.brand.tone }, null, 2),
    "README.md": `# Design Token Package — ${name}\n\nExportable tokens. No ForgeOS FHIS dependencies.\n`,
  };
}

/** Export API contracts to packages/contracts/ */
export function exportApiContracts(ctx: SharedContext): Record<string, string> {
  const { apiContract } = ctx;
  return {
    "packages/contracts/openapi.json": JSON.stringify(
      {
        openapi: "3.0.0",
        info: { title: ctx.companyIdentity.name, version: apiContract.version },
        paths: Object.fromEntries(
          apiContract.endpoints.map((e) => [
            e.path,
            { [e.method.toLowerCase()]: { summary: e.description, security: e.auth ? [{ bearerAuth: [] }] : [] } },
          ])
        ),
      },
      null,
      2
    ),
    "packages/contracts/types.ts": `/** Auto-generated API types — ${ctx.companyIdentity.name} */\nexport type ApiVersion = "${apiContract.version}";\n`,
    "packages/contracts/auth.ts": `/** Auth: ${apiContract.auth} */\nexport interface AuthContext { token: string; userId: string; role: string; }\n`,
    "packages/contracts/errors.ts": apiContract.errorCodes
      .map((e) => `export const ${e.code} = "${e.message}";`)
      .join("\n"),
    "packages/contracts/pagination.ts": `export const DEFAULT_LIMIT = ${apiContract.pagination.defaultLimit};\n`,
  };
}

/** Monorepo structure when Build DNA complexity warrants it */
export function suggestMonorepoStructure(ctx: SharedContext, outputCount: number): string[] | undefined {
  if (outputCount < 5) return undefined;
  const slug = slugify(ctx.companyIdentity.name);
  return [
    `apps/${slug}-website`,
    `apps/${slug}-web`,
    `apps/${slug}-mobile`,
    `apps/${slug}-api`,
    "packages/ui",
    "packages/contracts",
    "packages/config",
    "packages/types",
    "packages/analytics",
  ];
}

const contextStore = new Map<string, SharedContext>();

export function getSharedContext(missionId: string): SharedContext | null {
  return contextStore.get(missionId) ?? null;
}

export function saveSharedContext(ctx: SharedContext): SharedContext {
  contextStore.set(ctx.missionId, ctx);
  return ctx;
}

export function updateSharedContextField<K extends keyof SharedContext>(
  missionId: string,
  field: K,
  value: SharedContext[K]
): SharedContext | null {
  const existing = contextStore.get(missionId);
  if (!existing) return null;
  const updated = { ...existing, [field]: value, updatedAt: new Date().toISOString() };
  contextStore.set(missionId, updated);
  return updated;
}
