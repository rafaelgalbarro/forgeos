import Link from "next/link";
import type { FounderCalendarSection } from "@/lib/founder-dashboard/types";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface CalendarioPanelProps {
  calendario: FounderCalendarSection;
}

const PRIORITY_VARIANT: Record<"alta" | "media" | "baja", "red" | "amber" | "default"> = {
  alta: "red",
  media: "amber",
  baja: "default",
};

export function CalendarioPanel({ calendario }: CalendarioPanelProps) {
  const items = calendario?.items ?? [];

  return (
    <Panel className="fhis-founder-panel" id="founder-calendario">
      <SectionHeader title="Calendario" subtitle={calendario?.dateLabel ?? "Hoy"} />
      {items.length === 0 ? (
        <EmptyState
          icon="◎"
          title="Calendario vacío"
          description="No hay eventos programados para hoy."
        />
      ) : (
      <ul className="fhis-founder-calendar">
        {items.map((item) => {
          const content = (
            <>
              <span className="fhis-founder-calendar-time">{item.timeLabel}</span>
              <div className="fhis-founder-calendar-body">
                <div className="fhis-founder-calendar-head">
                  <strong>{item.title}</strong>
                  <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority}</Badge>
                </div>
                {item.ventureName && (
                  <span className="fhis-founder-calendar-venture">{item.ventureName}</span>
                )}
                <p>{item.description}</p>
              </div>
            </>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className="fhis-founder-calendar-item">
                  {content}
                </Link>
              ) : (
                <div className="fhis-founder-calendar-item">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      )}
    </Panel>
  );
}
