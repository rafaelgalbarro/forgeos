"use client";

import type { PlatformBuild } from "@/lib/mobile-factory";
import { formatBuildSummary, getBuildStatusVariant } from "@/lib/mobile-factory";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";

interface Props {
  android: PlatformBuild | null;
  ios: PlatformBuild | null;
}

export function MobileBuildStatus({ android, ios }: Props) {
  return (
    <Stack gap="md">
      <SectionHeader
        title="Builds de plataforma"
        subtitle="Android e iOS — builds simulados (stub, sin dispositivo real)."
      />
      <Grid cols={2} gap="md">
        <BuildCard platform="Android" icon="🤖" build={android} />
        <BuildCard platform="iOS" icon="🍎" build={ios} />
      </Grid>
    </Stack>
  );
}

function BuildCard({
  platform,
  icon,
  build,
}: {
  platform: string;
  icon: string;
  build: PlatformBuild | null;
}) {
  if (!build) {
    return (
      <Panel>
        <Stack gap="sm">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden>{icon}</span>
            <strong>{platform}</strong>
            <Badge variant="default">Pendiente</Badge>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
            Ejecuta el pipeline para generar el build.
          </p>
        </Stack>
      </Panel>
    );
  }

  const progress =
    build.status === "success" ? 100 : build.status === "running" ? 60 : build.status === "failed" ? 0 : 10;

  return (
    <Panel>
      <Stack gap="sm">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span aria-hidden>{icon}</span>
          <strong>{platform}</strong>
          <Badge variant={getBuildStatusVariant(build.status)}>{build.status}</Badge>
          {build.stub && <Badge variant="default">stub</Badge>}
        </div>

        <Progress value={progress} />

        <p style={{ margin: 0, fontSize: 13 }}>{formatBuildSummary(build)}</p>

        {build.buildId && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
            Build ID: {build.buildId}
          </p>
        )}

        {build.artifactUrl && (
          <a
            href={build.artifactUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--fhis-color-accent)" }}
          >
            Descargar artefacto →
          </a>
        )}

        {build.logs.length > 0 && (
          <details style={{ fontSize: 11, color: "var(--fhis-color-text-muted)" }}>
            <summary>Logs ({build.logs.length})</summary>
            <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: 10 }}>
              {build.logs.join("\n")}
            </pre>
          </details>
        )}
      </Stack>
    </Panel>
  );
}
