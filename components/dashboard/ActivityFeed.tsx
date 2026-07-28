import Link from "next/link";
import type { ActivityEvent, UpcomingAction } from "@/lib/portfolio";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Timeline } from "@/components/ui/fhis/Timeline";

const ACTIVITY_DEPARTMENT: Record<ActivityEvent["type"], string> = {
  ceo: "CEO",
  discovery: "Discovery",
  simulator: "Venture Simulator",
  build_plan: "Build",
  export: "Export",
  research: "Research",
  product: "Product",
  venture: "Venture",
};

const PRIORITY_LABEL: Record<UpcomingAction["priority"], string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORITY_VARIANT: Record<UpcomingAction["priority"], "red" | "amber" | "default"> = {
  alta: "red",
  media: "amber",
  baja: "default",
};

interface ActivityFeedProps {
  recentActivity: ActivityEvent[];
  upcomingActions: UpcomingAction[];
}

export function ActivityFeed({ recentActivity, upcomingActions }: ActivityFeedProps) {
  const timelineItems = recentActivity.map((event) => ({
    title: event.label,
    time: event.relative,
    description: [
      ACTIVITY_DEPARTMENT[event.type],
      event.ventureName,
    ].filter(Boolean).join(" · "),
  }));

  return (
    <aside className="fhis-dashboard-sidebar-col">
      <Panel>
        <SectionHeader title="Lo que ForgeOS hizo mientras no estabas" />
        {recentActivity.length === 0 ? (
          <p style={{ margin: 0, color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-sm)" }}>
            Sin actividad todavía.
          </p>
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Panel>

      <Panel>
        <SectionHeader title="Misiones" />
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--fhis-space-2)" }}>
          {upcomingActions.map((action) => (
            <li key={action.id}>
              <Link href={action.href} className="fhis-mission-item">
                <Badge variant={PRIORITY_VARIANT[action.priority]}>
                  {PRIORITY_LABEL[action.priority]}
                </Badge>
                <div>
                  <strong style={{ fontSize: "var(--fhis-text-sm)" }}>{action.label}</strong>
                  {action.ventureName && (
                    <span style={{ display: "block", fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)" }}>
                      {action.ventureName}
                    </span>
                  )}
                  <div className="fhis-mission-meta">
                    <span>{action.estimatedTime}</span>
                    <span>{action.impact}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </aside>
  );
}
