import Link from "next/link";
import type { FounderActivitySection } from "@/lib/founder-dashboard/types";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface ActividadPanelProps {
  actividad: FounderActivitySection;
}

export function ActividadPanel({ actividad }: ActividadPanelProps) {
  const items = actividad?.items ?? [];
  const upcomingCount = actividad?.upcomingCount ?? 0;

  return (
    <Panel className="fhis-founder-panel" id="founder-actividad">
      <SectionHeader
        title="Actividad"
        subtitle={
          upcomingCount > 0
            ? `${upcomingCount} acciones próximas en el portfolio`
            : "Últimos movimientos"
        }
      />
      {items.length === 0 ? (
        <p className="fhis-founder-prose">La actividad aparecerá cuando empieces a trabajar en empresas.</p>
      ) : (
        <ul className="fhis-founder-activity">
          {items.map((item) => {
            const row = (
              <>
                <span className="fhis-founder-activity-category">{item.category}</span>
                <strong>{item.label}</strong>
                {item.ventureName && (
                  <span className="fhis-founder-activity-venture">{item.ventureName}</span>
                )}
                <span className="fhis-founder-activity-time">{item.relative}</span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="fhis-founder-activity-item">
                    {row}
                  </Link>
                ) : (
                  <div className="fhis-founder-activity-item">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
