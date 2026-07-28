"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { UnavailableState } from "@/components/ui/UnavailableState";
import type { RouteStateVM } from "@/src/presentation/view-models/types";

export function RouteStatePanel({
  state,
  onRetry,
}: {
  state: RouteStateVM;
  onRetry?: () => void;
}) {
  if (state.kind === "loading") {
    return <LoadingState title={state.title} description={state.description} />;
  }
  if (state.kind === "empty") {
    return (
      <EmptyState title={state.title} description={state.description}>
        {state.retryHref && (
          <Link href={state.retryHref} className="fhis-btn fhis-btn-primary" style={{ marginTop: 12 }}>
            Continuar
          </Link>
        )}
      </EmptyState>
    );
  }
  if (state.kind === "unavailable" || state.kind === "permission_denied") {
    return (
      <UnavailableState
        toolName={state.title}
        reason={state.description}
        ctaHref={state.retryHref ?? "/mission-control"}
        ctaLabel="Ir a Mission Control"
      />
    );
  }
  if (state.kind === "error" || state.kind === "degraded" || state.kind === "partial") {
    return (
      <ErrorState title={state.title} description={state.description}>
        {onRetry && (
          <button type="button" className="fhis-btn fhis-btn-primary" style={{ marginTop: 16 }} onClick={onRetry}>
            Reintentar
          </button>
        )}
        {state.retryHref && (
          <Link href={state.retryHref} style={{ display: "block", marginTop: 12, fontSize: 13 }}>
            Volver
          </Link>
        )}
      </ErrorState>
    );
  }
  return null;
}
