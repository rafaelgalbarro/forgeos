import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { AgendaItem } from "@/lib/ceo-workspace";

const PRIORITY_VARIANT: Record<AgendaItem["priority"], "red" | "amber" | "blue"> = {
  alta: "red",
  media: "amber",
  baja: "blue",
};

interface DailyAgendaPanelProps {
  agenda: AgendaItem[];
}

export function DailyAgendaPanel({ agenda }: DailyAgendaPanelProps) {
  return (
    <Panel className="ceo-ws-panel" id="ceo-agenda">
      <SectionHeader title="Agenda del día" description="Plan operativo sugerido" />
      {agenda.length === 0 ? (
        <p className="ceo-ws-muted">Agenda vacía.</p>
      ) : (
        <ol className="ceo-ws-agenda">
          {agenda.map((item) => (
            <li key={item.id} className="ceo-ws-agenda-item">
              <time className="ceo-ws-agenda-time">{item.timeLabel}</time>
              <div className="ceo-ws-agenda-body">
                <div className="ceo-ws-list-head">
                  <strong>{item.title}</strong>
                  <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority}</Badge>
                </div>
                <p className="ceo-ws-list-body">{item.description}</p>
                {item.ventureName && (
                  <span className="ceo-ws-tag">{item.ventureName}</span>
                )}
                {item.href && (
                  <Link href={item.href} className="ceo-ws-link">
                    Ir →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
