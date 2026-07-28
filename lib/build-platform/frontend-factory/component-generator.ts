import type { ComponentSpec, FrontendFactoryInput } from "./types";

export function generateFhisComponentPlan(input: FrontendFactoryInput): ComponentSpec[] {
  const cards: ComponentSpec[] = [
    {
      id: "cmp-shell-container",
      name: "ShellContainer",
      fhisComponent: "Container",
      props: { maxWidth: "xl" },
      rationale: "Provides standardized FHIS page boundaries.",
    },
    {
      id: "cmp-page-panel",
      name: "PagePanel",
      fhisComponent: "Panel",
      props: { padded: true },
      rationale: "Groups page sections with consistent visual hierarchy.",
    },
    {
      id: "cmp-primary-action",
      name: "PrimaryActionButton",
      fhisComponent: "Button",
      variant: "primary",
      props: { size: "md" },
      rationale: "Primary CTA pattern for all interactive flows.",
    },
  ];

  if (input.dna.complexity !== "low") {
    cards.push({
      id: "cmp-grid",
      name: "AdaptiveGrid",
      fhisComponent: "Grid",
      props: { cols: 2 },
      rationale: "Supports multi-section pages for medium/high complexity products.",
    });
  }

  cards.push({
    id: "cmp-status",
    name: "StatusChip",
    fhisComponent: "Status",
    props: { tone: "active" },
    rationale: "Shared status language for workflows and dashboards.",
  });

  return cards;
}
