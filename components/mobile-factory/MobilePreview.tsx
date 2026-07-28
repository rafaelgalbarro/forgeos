"use client";

import type { ExpoPreview } from "@/lib/mobile-factory";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface Props {
  preview: ExpoPreview | null;
}

export function MobilePreview({ preview }: Props) {
  if (!preview) {
    return (
      <EmptyState
        title="Preview no disponible"
        description="Completa los pasos de estructura para generar el preview Expo."
      />
    );
  }

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader
          title="Preview Expo"
          subtitle="Escanea el QR con Expo Go o abre el enlace de preview."
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 180,
            background: "var(--fhis-color-surface)",
            borderRadius: 8,
            border: "1px dashed var(--fhis-color-border)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 120,
                height: 120,
                margin: "0 auto 12px",
                background:
                  "repeating-linear-gradient(45deg, #111 0, #111 4px, #fff 4px, #fff 8px)",
                borderRadius: 4,
              }}
              aria-label="QR code stub"
            />
            <Badge variant="accent">QR Stub</Badge>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
              {preview.qrCodeData}
            </p>
          </div>
        </div>

        <Stack gap="sm">
          <PreviewRow label="Slug" value={preview.projectSlug} />
          <PreviewRow label="Expo Go" value={preview.expoGoUrl} link />
          <PreviewRow label="Preview URL" value={preview.previewUrl} link />
          <PreviewRow
            label="Estado"
            value={preview.status}
            badge={preview.status === "success" ? "accent" : "amber"}
          />
          {preview.lastUpdated && (
            <PreviewRow
              label="Actualizado"
              value={new Date(preview.lastUpdated).toLocaleString("es-ES")}
            />
          )}
        </Stack>
      </Stack>
    </Panel>
  );
}

function PreviewRow({
  label,
  value,
  link,
  badge,
}: {
  label: string;
  value: string;
  link?: boolean;
  badge?: "accent" | "amber" | "default";
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--fhis-color-text-muted)" }}>{label}</span>
      {badge ? (
        <Badge variant={badge}>{value}</Badge>
      ) : link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--fhis-color-accent)", wordBreak: "break-all", textAlign: "right" }}
        >
          {value}
        </a>
      ) : (
        <span style={{ wordBreak: "break-all", textAlign: "right" }}>{value}</span>
      )}
    </div>
  );
}
