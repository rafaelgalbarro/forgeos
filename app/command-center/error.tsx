"use client";

import Link from "next/link";
import { Button } from "@/components/ui/fhis/Button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function CommandCenterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Command Center no disponible"
      description={error.message || "Ha ocurrido un error al cargar el centro de mando."}
    >
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Button onClick={() => reset()}>Reintentar</Button>
        <Link href="/" className="fhis-btn fhis-btn-secondary">
          Inicio
        </Link>
        <Link href="/mission-control" className="fhis-btn fhis-btn-secondary">
          Mission Control
        </Link>
      </div>
    </ErrorState>
  );
}
