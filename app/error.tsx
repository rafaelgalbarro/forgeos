"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 40, maxWidth: 560, margin: "0 auto" }}>
      <ErrorState
        title="Algo falló"
        description={error.message || "Error inesperado. Puedes reintentar o volver a Mission Control."}
      >
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" className="fhis-btn fhis-btn-primary" onClick={reset}>
            Reintentar
          </button>
          <Link href="/mission-control" className="fhis-btn">
            Mission Control
          </Link>
        </div>
      </ErrorState>
    </div>
  );
}
