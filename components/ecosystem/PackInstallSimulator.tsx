"use client";

import type { InstallSimulationResult } from "@/lib/ecosystem/types";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";

interface PackInstallSimulatorProps {
  result: InstallSimulationResult | null;
}

export function PackInstallSimulator({ result }: PackInstallSimulatorProps) {
  if (!result) return null;

  return (
    <div className="fhis-ecosystem-install-sim">
      <div className="fhis-ecosystem-install-header">
        <Status status={result.success ? "success" : "error"} label={result.success ? "Simulación OK" : "Error"} />
        <Badge variant="default">{result.mode}</Badge>
        <span className="fhis-ecosystem-pack-desc">{result.disclaimer}</span>
      </div>

      <div className="fhis-ecosystem-install-steps">
        {result.steps.map((step) => (
          <div key={step.id} className="fhis-ecosystem-install-step">
            <span className="fhis-ecosystem-install-step-label">{step.label}</span>
            <span className="fhis-ecosystem-install-step-msg">{step.message}</span>
          </div>
        ))}
      </div>

      {result.success && result.ceoMessage && (
        <div className="fhis-ecosystem-ceo-banner">
          <strong>{result.ceoMessage}</strong>
        </div>
      )}

      {result.resolvedDependencies.length > 0 && (
        <p className="fhis-ecosystem-pack-desc">
          Dependencias: {result.resolvedDependencies.join(", ")} · {result.durationMs}ms
        </p>
      )}
    </div>
  );
}
