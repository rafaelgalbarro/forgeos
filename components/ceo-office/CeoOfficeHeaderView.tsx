import type { CeoOfficeHeader } from "@/lib/ceo-office";
import type { SmartAction } from "@/lib/portfolio/impact-engine";
import { ActionButton } from "@/components/ui";

interface CeoOfficeHeaderViewProps {
  header: CeoOfficeHeader;
  smartAction: SmartAction | null;
  onFocusMode: () => void;
  notificationCount: number;
  onToggleNotifications: () => void;
}

export function CeoOfficeHeaderView({
  header,
  smartAction,
  onFocusMode,
  notificationCount,
  onToggleNotifications,
}: CeoOfficeHeaderViewProps) {
  return (
    <header className="ceo-office-header">
      <div className="ceo-office-header-main">
        <div className="ceo-office-header-top">
          <h1>Buenos días, {header.userName}.</h1>
          <div className="ceo-office-header-tools">
            <button
              type="button"
              className="ceo-notif-btn"
              onClick={onToggleNotifications}
              aria-label="Notificaciones"
            >
              Notificaciones
              {notificationCount > 0 && (
                <span className="ceo-notif-count">{notificationCount}</span>
              )}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onFocusMode}>
              Entrar en Focus Mode
            </button>
          </div>
        </div>
        <p className="ceo-office-absence-title">{header.title}</p>
        <ul className="ceo-office-absence-list">
          {header.absenceLines.map((line) => (
            <li key={line.id}>{line.text}</li>
          ))}
        </ul>
      </div>

      {smartAction && (
        <div className="ceo-smart-action glass">
          <span className="ceo-smart-label">Siguiente movimiento</span>
          <ActionButton href={smartAction.href} className="ceo-smart-cta">
            CONTINUAR DONDE MÁS IMPACTO GENERA
          </ActionButton>
          <div className="ceo-smart-meta">
            <div>
              <span>Impacto esperado</span>
              <p>{smartAction.impact}</p>
            </div>
            <div>
              <span>Tiempo estimado</span>
              <p>{smartAction.estimatedTime}</p>
            </div>
            <div>
              <span>Por qué ForgeOS lo recomienda</span>
              <p>{smartAction.rationale}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
