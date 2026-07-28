"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <OsModuleFrame title="Creation Output Studio" description="PROGRAM 5350">
      <ErrorState
        title="Error en Output Studio"
        description={error.message || "No se pudo cargar el studio."}
      >
        <button type="button" className="fhis-btn fhis-btn-primary" style={{ marginTop: 16 }} onClick={reset}>
          Reintentar
        </button>
      </ErrorState>
    </OsModuleFrame>
  );
}
