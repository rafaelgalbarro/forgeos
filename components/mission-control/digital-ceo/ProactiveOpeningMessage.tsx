"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";

interface Props {
  message: string;
  onDismiss?: () => void;
}

export function ProactiveOpeningMessage({ message, onDismiss }: Props) {
  const lines = message.split("\n").filter(Boolean);
  const greeting = lines[0] ?? "Hola, Fundador.";
  const body = lines.slice(1).join("\n");

  return (
    <Panel
      className="fhis-digital-ceo-opening"
      style={{
        borderLeft: "4px solid var(--fhis-color-accent, #6366f1)",
        background: "var(--fhis-color-surface-elevated, var(--fhis-color-surface))",
      }}
    >
      <Stack gap="sm">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Badge variant="accent">CEO Digital</Badge>
            <h3 style={{ margin: "8px 0 0", fontSize: "1rem", fontWeight: 600 }}>{greeting}</h3>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Cerrar briefing"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                color: "var(--fhis-color-text-muted)",
              }}
            >
              ×
            </button>
          )}
        </div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            fontSize: "0.875rem",
            lineHeight: 1.55,
            color: "var(--fhis-color-text-muted)",
          }}
        >
          {body}
        </pre>
      </Stack>
    </Panel>
  );
}
