import type { VentureProject } from "@/lib/domain/venture";
import { classifyIdea } from "@/lib/intelligence/heuristics";
import { generateClaudePrompt } from "./claude-prompt-generator";
import { generateCursorPrompt } from "./cursor-prompt-generator";
import { buildPromptContext } from "./prompt-context";
import { buildMvpChecklist, buildTechnicalRisks } from "./technical-checklist";
import type { ApiEndpoint, BuildPlan, StackItem } from "./types";
import { PENDING } from "./types";

function isMarketplace(venture: VentureProject): boolean {
  return (
    classifyIdea(venture.ideaText).isMarketplace ||
    venture.category === "marketplace" ||
    (venture.discoveryContext?.inferredProductType?.toLowerCase().includes("marketplace") ?? false)
  );
}

function hasPayments(venture: VentureProject): boolean {
  return venture.discoveryContext?.trustAndSafetyHints?.some((h) => /pago/i.test(h)) ?? false;
}

function buildStack(venture: VentureProject): StackItem[] {
  const marketplace = isMarketplace(venture);
  const b2b = classifyIdea(venture.ideaText).isB2B || venture.category === "saas";
  const payments = hasPayments(venture);

  const stack: StackItem[] = [
    {
      layer: "Frontend",
      technology: "Next.js 15 + React + TypeScript",
      rationale: "SSR/SSG, routing, API routes en un solo repo",
    },
    {
      layer: "Estilos",
      technology: "Tailwind CSS",
      rationale: "Velocidad de UI para MVP",
    },
    {
      layer: "Base de datos",
      technology: marketplace ? "PostgreSQL (Supabase o Neon)" : "PostgreSQL",
      rationale: "Relacional para entidades y transacciones",
    },
    {
      layer: "ORM",
      technology: "Prisma o Drizzle",
      rationale: "Migraciones tipadas y DX en TypeScript",
    },
    {
      layer: "Auth",
      technology: "NextAuth / Clerk / Supabase Auth",
      rationale: "Sesiones y OAuth sin reinventar",
    },
  ];

  if (payments) {
    stack.push({
      layer: "Pagos",
      technology: "Stripe (+ Connect si marketplace)",
      rationale: "Pagos y webhooks; Connect para C2C",
    });
  }

  if (marketplace) {
    stack.push(
      {
        layer: "Storage",
        technology: "S3 / Supabase Storage / Cloudinary",
        rationale: "Imágenes de listings",
      },
      {
        layer: "Búsqueda",
        technology: "PostgreSQL full-text → Algolia en v2",
        rationale: "MVP con FTS; escalar búsqueda después",
      }
    );
  }

  if (b2b) {
    stack.push({
      layer: "Email",
      technology: "Resend / Postmark",
      rationale: "Transaccional y onboarding",
    });
  }

  stack.push({
    layer: "Deploy",
    technology: "Vercel + managed Postgres",
    rationale: "CI/CD simple para MVP",
  });

  return stack;
}

function buildModules(venture: VentureProject): string[] {
  const marketplace = isMarketplace(venture);
  const modules = ["auth", "users", "core-domain", "api", "ui-shell", "analytics-events"];

  if (marketplace) {
    modules.push("listings", "search", "messaging", "reputation", "moderation");
  }
  if (hasPayments(venture)) {
    modules.push("payments", "webhooks", "transactions");
  }
  if (venture.productPRD?.mvpScope?.some((s) => /notif/i.test(s))) {
    modules.push("notifications");
  }

  return [...new Set(modules)];
}

function buildFolderStructure(venture: VentureProject): string[] {
  const slug = venture.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
  return [
    `${slug}/`,
    "├── src/",
    "│   ├── app/              # Next.js App Router",
    "│   │   ├── (auth)/",
    "│   │   ├── (dashboard)/",
    "│   │   └── api/",
    "│   ├── components/",
    "│   │   ├── ui/",
    "│   │   └── features/",
    "│   ├── lib/",
    "│   │   ├── db/",
    "│   │   ├── auth/",
    "│   │   └── validators/",
    "│   └── types/",
    "├── prisma/               # schema + migrations",
    "├── public/",
    "├── tests/",
    "└── package.json",
  ];
}

function buildEntities(venture: VentureProject): string[] {
  const marketplace = isMarketplace(venture);
  const entities = ["User", "Session"];

  if (marketplace) {
    entities.push("Listing", "Category", "Message", "Favorite", "Report");
  } else {
    entities.push("Project", "Item");
  }

  if (hasPayments(venture)) {
    entities.push("Transaction", "Payment", "Payout");
  }

  if (classifyIdea(venture.ideaText).isB2B) {
    entities.push("Organization", "Membership");
  }

  return entities;
}

function buildApis(venture: VentureProject): ApiEndpoint[] {
  const marketplace = isMarketplace(venture);
  const apis: ApiEndpoint[] = [
    { method: "POST", path: "/api/auth/*", description: "Autenticación y sesión" },
    { method: "GET", path: "/api/health", description: "Health check" },
  ];

  if (marketplace) {
    apis.push(
      { method: "GET", path: "/api/listings", description: "Listar y buscar anuncios" },
      { method: "POST", path: "/api/listings", description: "Crear anuncio" },
      { method: "GET", path: "/api/listings/[id]", description: "Detalle de anuncio" },
      { method: "PATCH", path: "/api/listings/[id]", description: "Actualizar anuncio" },
      { method: "POST", path: "/api/messages", description: "Enviar mensaje" },
      { method: "GET", path: "/api/messages", description: "Conversaciones del usuario" }
    );
  } else {
    apis.push(
      { method: "GET", path: "/api/items", description: "Recurso principal del dominio" },
      { method: "POST", path: "/api/items", description: "Crear recurso" }
    );
  }

  if (hasPayments(venture)) {
    apis.push(
      { method: "POST", path: "/api/checkout", description: "Iniciar pago" },
      { method: "POST", path: "/api/webhooks/stripe", description: "Webhooks Stripe" }
    );
  }

  return apis;
}

function buildComponents(venture: VentureProject): string[] {
  const prd = venture.productPRD;
  const base = [
    "AppShell / Layout",
    "Navbar",
    "AuthForm (login/register)",
    "LoadingState",
    "EmptyState",
    "ErrorBoundary",
  ];

  if (isMarketplace(venture)) {
    base.push(
      "ListingCard",
      "ListingGrid",
      "ListingForm",
      "SearchFilters",
      "MessageThread",
      "UserAvatar"
    );
  }

  if (prd?.mainScreens?.length) {
    prd.mainScreens.slice(0, 6).forEach((screen) => {
      const component = screen.replace(/\s+/g, "") + "Page";
      if (!base.some((b) => b.toLowerCase().includes(screen.toLowerCase()))) {
        base.push(component);
      }
    });
  }

  return [...new Set(base)];
}

function buildScreens(venture: VentureProject): string[] {
  if (venture.productPRD?.mainScreens?.length) {
    return venture.productPRD.mainScreens;
  }

  if (isMarketplace(venture)) {
    return [
      "Home / Feed de anuncios",
      "Búsqueda y filtros",
      "Detalle de anuncio",
      "Publicar anuncio",
      "Mensajes",
      "Perfil de usuario",
      "Login / Registro",
    ];
  }

  return [
    "Landing",
    "Dashboard",
    "Flujo principal",
    "Configuración",
    "Login / Registro",
  ];
}

function buildDependencies(venture: VentureProject): string[] {
  const deps = [
    "next",
    "react",
    "react-dom",
    "typescript",
    "tailwindcss",
    "@prisma/client",
    "prisma",
    "zod",
    "clsx",
  ];

  if (hasPayments(venture)) deps.push("stripe");
  if (isMarketplace(venture)) deps.push("uploadthing", "date-fns");
  deps.push("next-auth", "lucide-react");

  return deps;
}

function buildImplementationOrder(venture: VentureProject): string[] {
  const order = [
    "Inicializar repo, TypeScript, lint y estructura de carpetas",
    "Configurar base de datos, ORM y migración inicial",
    "Implementar autenticación y modelo User",
  ];

  if (isMarketplace(venture)) {
    order.push(
      "CRUD de listings con upload de imágenes",
      "Búsqueda, filtros y página de detalle",
      "Mensajería básica entre usuarios"
    );
  } else {
    order.push("Modelo de dominio core y APIs REST", "Pantalla principal del flujo happy-path");
  }

  if (hasPayments(venture)) {
    order.push("Integración Stripe checkout + webhooks");
  }

  order.push(
    "Landing y onboarding",
    "Eventos analytics mínimos",
    "Deploy staging, smoke tests y checklist MVP"
  );

  return order;
}

function buildTechnicalSummary(venture: VentureProject): string {
  const intel = venture.intelligenceReport;
  const complexity = intel?.technicalComplexity ?? "media";
  const mvpTime = intel?.estimatedMvpTime ?? "4-8 semanas";
  const marketplace = isMarketplace(venture);

  return (
    `MVP ${marketplace ? "marketplace" : venture.category} para ${venture.targetAudience}. ` +
    `Complejidad técnica estimada: ${complexity}. ` +
    `Ventana de implementación objetivo: ${mvpTime}. ` +
    `Enfoque: monolito Next.js con PostgreSQL, entregar flujo principal antes de features secundarias.`
  );
}

export function generateBuildPlan(venture: VentureProject): BuildPlan {
  const stack = buildStack(venture);
  const implementationOrder = buildImplementationOrder(venture);
  const stackSummary = stack.map((s) => `- **${s.layer}:** ${s.technology} — ${s.rationale}`).join("\n");

  const promptCtx = buildPromptContext(venture, stackSummary, implementationOrder);
  const mvpChecklist = buildMvpChecklist(venture);

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    technicalSummary: buildTechnicalSummary(venture),
    recommendedStack: stack,
    technicalModules: buildModules(venture),
    folderStructure: buildFolderStructure(venture),
    mainEntities: buildEntities(venture),
    apis: buildApis(venture),
    frontendComponents: buildComponents(venture),
    screens: buildScreens(venture),
    suggestedDependencies: buildDependencies(venture),
    technicalRisks: buildTechnicalRisks(venture),
    implementationOrder,
    mvpChecklist,
    cursorPrompt: generateCursorPrompt(promptCtx),
    claudePrompt: generateClaudePrompt(promptCtx),
    generatedAt: new Date().toISOString(),
  };
}

export function exportBuildPlanAsMarkdown(plan: BuildPlan): string {
  const stackTable = plan.recommendedStack
    .map((s) => `| ${s.layer} | ${s.technology} | ${s.rationale} |`)
    .join("\n");

  const apisTable = plan.apis
    .map((a) => `| ${a.method} | \`${a.path}\` | ${a.description} |`)
    .join("\n");

  const checklist = plan.mvpChecklist
    .map((c) => `- [ ] **[${c.priority}]** ${c.task} _(${c.phase})_`)
    .join("\n");

  return `# Build Plan — ${plan.ventureName}

> Generado por ForgeOS · ${plan.generatedAt.slice(0, 10)} · Handoff para Cursor / Claude

## Resumen técnico

${plan.technicalSummary}

## Stack recomendado

| Capa | Tecnología | Razón |
|------|------------|-------|
${stackTable}

## Módulos técnicos

${plan.technicalModules.map((m) => `- ${m}`).join("\n")}

## Estructura de carpetas

\`\`\`
${plan.folderStructure.join("\n")}
\`\`\`

## Entidades principales

${plan.mainEntities.map((e) => `- ${e}`).join("\n")}

## APIs necesarias

| Método | Ruta | Descripción |
|--------|------|-------------|
${apisTable}

## Componentes frontend

${plan.frontendComponents.map((c) => `- ${c}`).join("\n")}

## Pantallas

${plan.screens.map((s) => `- ${s}`).join("\n")}

## Dependencias sugeridas

\`\`\`
${plan.suggestedDependencies.join("\n")}
\`\`\`

## Riesgos técnicos

${plan.technicalRisks.map((r) => `- ${r}`).join("\n")}

## Orden de implementación

${plan.implementationOrder.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Checklist MVP

${checklist}

---

## Prompt Cursor

\`\`\`
${plan.cursorPrompt}
\`\`\`

---

## Prompt Claude

\`\`\`
${plan.claudePrompt}
\`\`\`
`;
}

export function exportBuildPlanMarkdownFromVenture(venture: VentureProject): string {
  return exportBuildPlanAsMarkdown(generateBuildPlan(venture));
}
