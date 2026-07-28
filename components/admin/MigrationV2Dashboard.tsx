import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Container, Panel, Stack, Grid } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { MigrationDashboardSummary } from "@/src/core/migration/dashboard/summary";

function statusVariant(status: string): "default" | "accent" | "blue" | "amber" | "red" {
  if (status === "V2_PRIMARY" || status === "DUAL_READ" || status === "DUAL_WRITE") return "accent";
  if (status === "ADAPTER_READY") return "amber";
  if (status === "DEPRECATED" || status === "REMOVED") return "red";
  if (status === "NOT_STARTED") return "default";
  return "blue";
}

export function MigrationV2Dashboard({ summary }: { summary: MigrationDashboardSummary }) {
  return (
    <PageTemplate
      title="Migration V2"
      subtitle={`${summary.version} · registry seed ${summary.seedCount} · ${
        summary.legacyOnly ? "legacy-only (all V2 flags off)" : "partial V2 flags on"
      }`}
    >
      <Container>
        <Stack gap="lg">
          <Grid cols={4} gap="md">
            <KpiBlock label="Past NOT_STARTED" value={`${summary.progress.percentPastNotStarted}%`} />
            <KpiBlock label="Fallbacks" value={String(summary.telemetry.fallbackCount)} />
            <KpiBlock label="Divergences" value={String(summary.telemetry.divergenceCount)} />
            <KpiBlock label="Errors" value={String(summary.telemetry.errorCount)} />
          </Grid>

          <Panel>
            <SectionHeader
              title="Feature flags"
              description="Defaults are all false — gradual enablement only."
            />
            <Stack gap="sm">
              {Object.entries(summary.flags).map(([key, enabled]) => (
                <div key={key} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <Badge variant={enabled ? "accent" : "default"}>{enabled ? "ON" : "OFF"}</Badge>
                  <code>{key}</code>
                </div>
              ))}
            </Stack>
          </Panel>

          <Panel>
            <SectionHeader title="Registry progress" description="Strangler flows A–J" />
            <Stack gap="sm">
              {summary.components.map((c) => (
                <div
                  key={c.component}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{c.label}</strong>
                    <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                      {c.component} · {c.flow}
                    </div>
                  </div>
                  <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                </div>
              ))}
            </Stack>
          </Panel>

          <Panel>
            <SectionHeader title="Next components" description="Suggested strangler order" />
            <Stack gap="sm">
              {summary.next.map((n) => (
                <div key={n.component}>
                  <Badge variant={statusVariant(n.status)}>{n.status}</Badge> {n.label}{" "}
                  <code>{n.component}</code>
                </div>
              ))}
            </Stack>
          </Panel>

          <Panel>
            <SectionHeader
              title="Telemetry"
              description="Fallbacks and divergences are never hidden."
            />
            <Stack gap="md">
              <div>
                <strong>Recent fallbacks</strong>
                {summary.telemetry.recentFallbacks.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>None recorded this process lifetime.</p>
                ) : (
                  <ul>
                    {summary.telemetry.recentFallbacks.map((f, i) => (
                      <li key={`${f.at}-${i}`}>
                        <code>{f.component}</code> — {f.reason}
                        {f.details ? `: ${f.details}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <strong>Recent divergences</strong>
                {summary.telemetry.recentDivergences.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>None recorded this process lifetime.</p>
                ) : (
                  <ul>
                    {summary.telemetry.recentDivergences.map((d, i) => (
                      <li key={`${d.at}-${i}`}>
                        <code>{d.component}</code>/{d.kind} — {d.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <strong>Recent errors</strong>
                {summary.telemetry.recentErrors.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>None recorded this process lifetime.</p>
                ) : (
                  <ul>
                    {summary.telemetry.recentErrors.map((e, i) => (
                      <li key={`${e.at}-${i}`}>
                        <code>{e.component}</code> — {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Stack>
          </Panel>
        </Stack>
      </Container>
    </PageTemplate>
  );
}
