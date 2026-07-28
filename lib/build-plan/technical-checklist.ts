import type { VentureProject } from "@/lib/domain/venture";
import { classifyIdea } from "@/lib/intelligence/heuristics";
import type { ChecklistItem } from "./types";

export function buildMvpChecklist(venture: VentureProject): ChecklistItem[] {
  const { isMarketplace, isB2B } = classifyIdea(venture.ideaText);
  const hasPayments =
    venture.discoveryContext?.trustAndSafetyHints?.some((h) => /pago/i.test(h)) ?? false;
  const prd = venture.productPRD;

  const items: ChecklistItem[] = [
    { id: "auth", task: "Autenticación (email/OAuth) y sesión", phase: "Fundación", priority: "alta" },
    { id: "schema", task: "Esquema de base de datos y migraciones iniciales", phase: "Fundación", priority: "alta" },
    { id: "landing", task: "Landing page con propuesta de valor clara", phase: "Fundación", priority: "alta" },
  ];

  if (isMarketplace) {
    items.push(
      { id: "listings", task: "CRUD de anuncios/listings con imágenes", phase: "Core", priority: "alta" },
      { id: "search", task: "Búsqueda y filtros básicos", phase: "Core", priority: "alta" },
      { id: "messaging", task: "Mensajería o contacto entre usuarios", phase: "Core", priority: "media" }
    );
  }

  if (isB2B) {
    items.push(
      { id: "org", task: "Multi-tenant o equipos/organizaciones", phase: "Core", priority: "alta" },
      { id: "billing", task: "Facturación B2B / planes", phase: "Monetización", priority: "media" }
    );
  }

  if (hasPayments) {
    items.push(
      { id: "payments", task: "Integración de pagos (Stripe) y webhooks", phase: "Monetización", priority: "alta" },
      { id: "disputes", task: "Flujo básico de disputas/reembolsos", phase: "Monetización", priority: "media" }
    );
  }

  if (prd?.mvpScope?.length) {
    prd.mvpScope.slice(0, 5).forEach((scope, i) => {
      items.push({
        id: `mvp-${i}`,
        task: scope,
        phase: "MVP",
        priority: "alta",
      });
    });
  } else {
    items.push({
      id: "mvp-core",
      task: "Flujo principal del producto (happy path)",
      phase: "MVP",
      priority: "alta",
    });
  }

  items.push(
    { id: "metrics", task: "Eventos analytics mínimos (signup, conversión core)", phase: "Validación", priority: "media" },
    { id: "deploy", task: "Deploy staging + smoke tests", phase: "Validación", priority: "alta" },
    { id: "legal", task: "Términos, privacidad y cookies básicos", phase: "Validación", priority: "baja" }
  );

  return items;
}

export function buildTechnicalRisks(venture: VentureProject): string[] {
  const risks: string[] = [];
  const intel = venture.intelligenceReport;
  const { isMarketplace } = classifyIdea(venture.ideaText);

  intel?.risks?.slice(0, 2).forEach((r) => risks.push(`${r.title}: ${r.description}`));
  venture.discoveryContext?.buildConstraints?.forEach((c) => risks.push(c));

  if (isMarketplace) {
    risks.push("Cold start: necesitas densidad local antes de escalar features");
    risks.push("Moderación de contenido y fraude en listings");
  }

  if (venture.discoveryContext?.trustAndSafetyHints?.some((h) => /pago/i.test(h))) {
    risks.push("Complejidad PCI/compliance al integrar pagos");
  }

  const complexity = intel?.technicalComplexity?.toLowerCase() ?? "";
  if (complexity.includes("alta")) {
    risks.push("Alcance técnico elevado — riesgo de retrasar MVP");
  }

  if (risks.length === 0) {
    risks.push("Validar supuestos técnicos antes de comprometer arquitectura distribuida");
  }

  return [...new Set(risks)].slice(0, 8);
}
