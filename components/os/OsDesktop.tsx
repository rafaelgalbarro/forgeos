"use client";

import { OsCeoHome } from "./OsCeoHome";
import { DESKTOP_WIDGETS } from "@/lib/os/workspace-manager";
import {
  BuildWidget,
  CalendarWidget,
  CeoWidget,
  InvestmentWidget,
  PortfolioWidget,
  TasksWidget,
  TimelineWidget,
} from "./widgets/OsWidgets";

const WIDGET_MAP = {
  ceo: CeoWidget,
  investment: InvestmentWidget,
  tasks: TasksWidget,
  build: BuildWidget,
  portfolio: PortfolioWidget,
  timeline: TimelineWidget,
  calendar: CalendarWidget,
} as const;

export function OsDesktop() {
  return (
    <div className="fhis-os-desktop">
      <OsCeoHome />
      <div className="fhis-os-widget-grid">
        {DESKTOP_WIDGETS.map((w) => {
          const Component = WIDGET_MAP[w.type];
          return (
            <div
              key={w.id}
              className={w.colSpan === 2 ? "fhis-os-widget-span-2" : "fhis-os-widget-span-1"}
            >
              <Component />
            </div>
          );
        })}
      </div>
    </div>
  );
}
