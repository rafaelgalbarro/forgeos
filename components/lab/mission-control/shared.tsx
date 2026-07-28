"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { cn } from "@/lib/design-system/cn";

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("fhis-mc-section-title", className)} style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 var(--fhis-space-2)" }}>
      {children}
    </h2>
  );
}

export function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="fhis-mc-metric-row" style={{ display: "flex", justifyContent: "space-between", gap: "var(--fhis-space-2)", fontSize: "0.8125rem" }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ textAlign: "right", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: "var(--fhis-space-3)",
        fontSize: "0.75rem",
        overflow: "auto",
        maxHeight: "360px",
        background: "var(--fhis-color-surface-2, #111)",
        borderRadius: "var(--fhis-radius-sm, 4px)",
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function TechnicalToggle({
  label = "Ver detalles técnicos",
  data,
}: {
  label?: string;
  data: unknown;
}) {
  const [open, setOpen] = useState(false);
  if (data == null) return null;
  return (
    <div style={{ marginTop: "var(--fhis-space-3)" }}>
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? "Ocultar detalles técnicos" : label}
      </Button>
      {open && (
        <div style={{ marginTop: "var(--fhis-space-2)" }}>
          <JsonBlock data={data} />
        </div>
      )}
    </div>
  );
}

export function sourceBadge(source: string | undefined) {
  switch (source) {
    case "ai":
      return <Badge variant="accent">AI</Badge>;
    case "mock":
      return <Badge variant="amber">Mock</Badge>;
    case "heuristic":
      return <Badge variant="blue">Heurístico</Badge>;
    default:
      return <Badge variant="default">{source ?? "—"}</Badge>;
  }
}

export function confidenceTone(confidence: number): "success" | "warning" | "error" {
  if (confidence >= 0.75) return "success";
  if (confidence >= 0.5) return "warning";
  return "error";
}

export function confidenceColor(confidence: number): string {
  const tone = confidenceTone(confidence);
  if (tone === "success") return "var(--fhis-color-success, #22c55e)";
  if (tone === "warning") return "var(--fhis-color-warning, #f59e0b)";
  return "var(--fhis-color-error, #ef4444)";
}

export function consensusLevelVariant(
  level: string
): "accent" | "blue" | "amber" | "default" {
  switch (level) {
    case "UNANIMOUS":
    case "HIGH_CONSENSUS":
      return "accent";
    case "MEDIUM_CONSENSUS":
      return "blue";
    case "LOW_CONSENSUS":
      return "amber";
    default:
      return "default";
  }
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatMs(ms: number): string {
  return `${ms.toLocaleString()} ms`;
}

export function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(4)}`;
}
