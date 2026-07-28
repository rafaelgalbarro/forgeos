"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 28 }}>
      <ErrorState title="Error en Company Command Center" description={error.message || "No se pudo cargar /company/[ventureId]."}>
        <button type="button" className="fhis-btn fhis-btn-primary" style={{ marginTop: 16 }} onClick={reset}>
          Reintentar
        </button>
      </ErrorState>
    </div>
  );
}
