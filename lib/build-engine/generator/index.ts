import type { VentureProject } from "@/lib/domain/venture";
import type { ArtifactType, BuildArtifact } from "../types";

const ARTIFACT_DEFS: { type: ArtifactType; title: string; description: string }[] = [
  { type: "Architecture", title: "System Architecture", description: "Diagrama y decisiones de arquitectura." },
  { type: "Database", title: "Database Schema", description: "Entidades, relaciones y migraciones." },
  { type: "Backend", title: "Backend Services", description: "API routes, lógica de negocio, auth." },
  { type: "API", title: "API Specification", description: "Endpoints REST/GraphQL documentados." },
  { type: "Frontend", title: "Frontend Application", description: "Componentes, páginas y estado." },
  { type: "CI/CD", title: "CI/CD Pipeline", description: "GitHub Actions, tests automáticos." },
  { type: "Testing", title: "Test Suite", description: "Unit, integration y e2e tests." },
  { type: "Deployment", title: "Deployment Config", description: "Vercel, Docker, env vars." },
  { type: "Documentation", title: "Technical Docs", description: "README, API docs, runbook." },
];

export function generateArtifacts(venture: VentureProject): BuildArtifact[] {
  const hasProduct = !!venture.productPRD;
  const isBuilding = venture.status === "building" || venture.status === "ready";

  return ARTIFACT_DEFS.map((def, i) => {
    let status: BuildArtifact["status"] = "draft";
    if (hasProduct && isBuilding) status = "ready";
    if (venture.sections.some((s) => s.content && s.id.includes(def.type.toLowerCase()))) {
      status = "generated";
    }

    return {
      id: `${venture.id}-artifact-${i}`,
      type: def.type,
      title: def.title,
      description: def.description,
      status,
    };
  });
}
