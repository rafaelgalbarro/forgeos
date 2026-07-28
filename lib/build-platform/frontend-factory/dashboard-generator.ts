import type { DashboardSpec, FrontendFactoryInput } from "./types";

export function generateDashboardPlan(input: FrontendFactoryInput): DashboardSpec[] {
  const preferred = input.registry.preferredWidgets;
  const widgetRefs = preferred.slice(0, 4).map((widgetId, index) => ({
    widgetId,
    position: (index === 0 ? "hero" : index <= 2 ? "row-1" : "row-2") as "hero" | "row-1" | "row-2",
  }));

  return [
    {
      id: "dashboard-main",
      title: `${input.context.meta.ventureName} Command Center`,
      audience: "founder",
      widgets: widgetRefs.length
        ? widgetRefs
        : [
            { widgetId: "widget-kpi-growth", position: "hero" },
            { widgetId: "widget-status-pipeline", position: "row-1" },
            { widgetId: "widget-timeline-execution", position: "row-2" },
          ],
    },
  ];
}
