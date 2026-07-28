import type { CompanyDashboardReadModel, HealthBucket } from "./read-model";
import { normalizeReadiness } from "./status";

export function buildHealthBuckets(model: CompanyDashboardReadModel): HealthBucket[] {
  const productReady = model.products.filter((p) => p.readiness === "READY").length;
  const scoreBase = model.products.length === 0 ? 0 : Math.round((productReady / model.products.length) * 100);

  const section = (id: string) => model.sections.find((s) => s.id === id);

  return [
    { id: "company", label: "Company", status: section("header")?.readiness || "NOT_STARTED", score: scoreBase },
    { id: "product", label: "Product", status: section("products")?.readiness || "NOT_STARTED", score: scoreBase },
    {
      id: "technical",
      label: "Technical",
      status: section("technical")?.readiness || "NOT_STARTED",
      score: Math.min(100, scoreBase + (model.technicalFoundation.length > 0 ? 10 : 0)),
    },
    { id: "gtm", label: "GTM", status: section("business")?.readiness || "PLANNED", score: Math.max(0, scoreBase - 20) },
    {
      id: "operational",
      label: "Operational",
      status: model.blockers.length > 0 ? "BLOCKED" : "PARTIAL",
      score: model.blockers.length > 0 ? 25 : 60,
    },
    { id: "release", label: "Release", status: normalizeReadiness(model.release.status), score: scoreBase },
  ];
}
