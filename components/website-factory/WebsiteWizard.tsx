"use client";

import { cn } from "@/lib/design-system/cn";
import type { WizardStep, WizardStepId } from "@/lib/website-factory";

interface WebsiteWizardProps {
  steps: WizardStep[];
  selectedStepId: WizardStepId;
  onSelectStep: (id: WizardStepId) => void;
  onRunStep?: (id: WizardStepId) => void;
  running?: boolean;
}

const STATUS_DOT: Record<WizardStep["status"], string> = {
  completed: "var(--fhis-color-green)",
  active: "var(--fhis-color-accent)",
  blocked: "var(--fhis-color-red)",
  pending: "var(--fhis-color-line)",
  skipped: "var(--fhis-color-text-muted)",
};

const STATUS_LABEL: Record<WizardStep["status"], string> = {
  completed: "Completado",
  active: "Activo",
  blocked: "Bloqueado",
  pending: "Pendiente",
  skipped: "Omitido",
};

export function WebsiteWizard({
  steps,
  selectedStepId,
  onSelectStep,
  onRunStep,
  running = false,
}: WebsiteWizardProps) {
  const selected = steps.find((s) => s.id === selectedStepId);

  return (
    <div className="fhis-wf-wizard">
      <div
        className="fhis-panel"
        style={{ padding: "var(--fhis-space-4)", overflowX: "auto" }}
        role="tablist"
        aria-label="Website Factory pipeline"
      >
        <div style={{ display: "flex", gap: "var(--fhis-space-2)", minWidth: "max-content" }}>
          {steps.map((step, index) => {
            const isSelected = step.id === selectedStepId;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectStep(step.id)}
                className={cn("fhis-card", isSelected && "fhis-card-elevated")}
                style={{
                  minWidth: 108,
                  textAlign: "left",
                  cursor: "pointer",
                  border: isSelected
                    ? "1px solid var(--fhis-color-accent)"
                    : "1px solid var(--fhis-color-line)",
                  background: isSelected ? "var(--fhis-color-accent-dim)" : "var(--fhis-color-panel)",
                  padding: "var(--fhis-space-3)",
                }}
              >
                <div style={{ fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)" }}>
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STATUS_DOT[step.status],
                    margin: "var(--fhis-space-2) 0",
                  }}
                />
                <div style={{ fontSize: "var(--fhis-text-sm)", fontWeight: "var(--fhis-weight-semibold)" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)" }}>
                  {STATUS_LABEL[step.status]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="fhis-panel" style={{ padding: "var(--fhis-space-4)", marginTop: "var(--fhis-space-3)" }}>
          <h3 style={{ margin: "0 0 8px" }}>{selected.label}</h3>
          <p style={{ margin: "0 0 12px", color: "var(--fhis-color-text-muted)" }}>
            {selected.summary || "Ejecuta esta etapa para generar output."}
          </p>
          {onRunStep && selected.status !== "completed" && (
            <button
              type="button"
              className="fhis-btn fhis-btn-primary"
              disabled={running}
              onClick={() => onRunStep(selected.id)}
            >
              {running ? "Ejecutando…" : "Ejecutar etapa"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
