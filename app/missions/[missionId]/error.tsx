"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function MissionPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 28 }}>
      <ErrorState title="Error en Mission Page" description={error.message || "No se pudo cargar la misión."}>
        <button type="button" className="fhis-btn fhis-btn-primary" style={{ marginTop: 16 }} onClick={reset}>
          Reintentar
        </button>
      </ErrorState>
    </div>
  );
}
