import type { FrontendFactoryInput, WidgetSpec } from "./types";

const DEFAULT_WIDGETS: WidgetSpec[] = [
  {
    id: "widget-kpi-growth",
    title: "Growth KPI",
    kind: "kpi",
    source: "build-context.analytics",
    fhisComponent: "KpiBlock",
  },
  {
    id: "widget-status-pipeline",
    title: "Pipeline Status",
    kind: "status",
    source: "build-context.buildPlan",
    fhisComponent: "Status",
  },
  {
    id: "widget-timeline-execution",
    title: "Execution Timeline",
    kind: "timeline",
    source: "build-registry.entries",
    fhisComponent: "Timeline",
  },
];

export function generateWidgetPlan(input: FrontendFactoryInput): WidgetSpec[] {
  const registryWidgets = input.registry.entries
    .filter((entry) => entry.category === "widget")
    .slice(0, 5)
    .map<WidgetSpec>((entry, index) => ({
      id: entry.id,
      title: entry.name,
      kind: index % 2 === 0 ? "kpi" : "list",
      source: `build-registry.entries:${entry.id}`,
      fhisComponent: index % 2 === 0 ? "KpiBlock" : "Card",
    }));

  return registryWidgets.length ? registryWidgets : DEFAULT_WIDGETS;
}
