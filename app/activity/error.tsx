"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 28 }}>
      <ErrorState title="Error en Activity" description={error.message || "No se pudo cargar Activity."}>
        <button type="button" className="fhis-btn fhis-btn-primary" style={{ marginTop: 16 }} onClick={reset}>
          Reintentar
        </button>
      </ErrorState>
    </div>
  );
}
