import type { CompanyDashboardAction, ProductCardModel } from "./read-model";

export function deriveNextActions(input: {
  ventureId: string;
  products: ProductCardModel[];
  blockers: string[];
  pendingApprovals: Array<{ id: string; label: string }>;
}): CompanyDashboardAction[] {
  const actions: CompanyDashboardAction[] = [];

  const missionId = input.products[0]?.missionId;
  if (input.pendingApprovals.length > 0) {
    actions.push({
      id: "resolve-approvals",
      label: "Resolve pending approvals",
      href: missionId ? `/missions/${missionId}?section=decisions` : "/mission-control",
      priority: "high",
    });
  }

  if (input.blockers.length > 0) {
    actions.push({
      id: "review-blockers",
      label: "Review blockers and failed steps",
      href: `/company/${input.ventureId}?focus=blockers`,
      priority: "high",
    });
  }

  const firstWithoutPreview = input.products.find((p) => !p.previewUrl);
  if (firstWithoutPreview) {
    actions.push({
      id: "generate-preview",
      label: `Generate preview for ${firstWithoutPreview.name}`,
      href: `/studio/${firstWithoutPreview.missionId}/preview`,
      priority: "medium",
    });
  }

  const firstReady = input.products.find((p) => p.readiness === "READY");
  if (firstReady) {
    actions.push({
      id: "request-change",
      label: "Request Change",
      href: `/missions/${firstReady.missionId}?section=decisions`,
      priority: "low",
    });
  }

  return actions.slice(0, 6);
}
