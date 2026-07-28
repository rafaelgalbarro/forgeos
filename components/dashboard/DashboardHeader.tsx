import Link from "next/link";
import type { DashboardHeaderData } from "@/lib/portfolio";
import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";

interface DashboardHeaderProps {
  header: DashboardHeaderData;
}

const PRIORITY_LABEL: Record<NonNullable<DashboardHeaderData["missionPriority"]>, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORITY_VARIANT: Record<NonNullable<DashboardHeaderData["missionPriority"]>, "red" | "amber" | "default"> = {
  alta: "red",
  media: "amber",
  baja: "default",
};

export function DashboardHeader({ header }: DashboardHeaderProps) {
  const hasMission = header.missionVenture.length > 0 && header.missionPriority;

  return (
    <header className="fhis-dashboard-header">
      <div>
        <p className="fhis-dashboard-kicker">CEO Command Center</p>
        <h1 className="fhis-section-header-title">Buenos días, {header.userName}.</h1>

        <div className="fhis-stack fhis-stack-gap-sm" style={{ margin: "var(--fhis-space-4) 0 var(--fhis-space-6)", maxWidth: 680 }}>
          <p style={{ margin: 0, color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-base)", lineHeight: 1.6 }}>
            Mientras no estabas, ForgeOS ha seguido trabajando.
          </p>
          <p style={{ margin: 0, color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-base)", lineHeight: 1.6 }}>
            He revisado todo tu portfolio y he encontrado una decisión que puede aumentar
            significativamente la probabilidad de éxito.
          </p>
        </div>

        <div className="fhis-dashboard-mission">
          <div className="fhis-dashboard-mission-head">
            <span className="fhis-dashboard-mission-label">Siguiente misión</span>
            {hasMission && header.missionPriority && (
              <Badge variant={PRIORITY_VARIANT[header.missionPriority]}>
                {PRIORITY_LABEL[header.missionPriority]}
              </Badge>
            )}
          </div>
          {hasMission ? (
            <>
              <p className="fhis-dashboard-mission-action">{header.missionLabel}</p>
              <p className="fhis-dashboard-mission-venture">{header.missionVenture}</p>
            </>
          ) : (
            <p className="fhis-dashboard-mission-action">{header.nextActionLine}</p>
          )}
        </div>

        <div className="fhis-stack fhis-stack-gap-md" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="fhis-stack fhis-stack-gap-sm">
            <Link
              href={header.continueHref}
              className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-lg")}
            >
              ▶ Ejecutar siguiente decisión
            </Link>

            {header.impactBullets.length > 0 && (
              <div>
                <span className="fhis-dashboard-impact-label">Impacto esperado</span>
                <ul className="fhis-dashboard-impact-list">
                  {header.impactBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}

            {header.estimatedTime && (
              <p className="fhis-dashboard-time">
                <span>Tiempo estimado</span>
                {header.estimatedTime}
              </p>
            )}
          </div>

          <Link href="/" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-md")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            Crear Empresa
          </Link>
        </div>
      </div>
    </header>
  );
}
