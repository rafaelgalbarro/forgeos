import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import { Stack } from "@/components/ui/fhis/Layout";

interface InvestmentReadinessSectionProps {
  data: VentureWorkspaceSnapshot;
}

const STATUS_VARIANT = {
  ready: "accent" as const,
  progress: "blue" as const,
  pending: "default" as const,
};

export function InvestmentReadinessSection({ data }: InvestmentReadinessSectionProps) {
  const { investmentReadiness: ir } = data;
  return (
    <Panel id="investment-readiness" className="fhis-vws-section">
      <SectionHeader title="Investment Readiness" subtitle={ir.overallLabel} />
      <Progress value={ir.overallScore} label="Preparación global" showValue />
      <Stack gap="md">
        {ir.metrics.map((m) => (
          <div key={m.id} className="fhis-vws-readiness-row">
            <div className="fhis-vws-readiness-head">
              <span>{m.label}</span>
              <Badge variant={STATUS_VARIANT[m.status]}>
                {m.score}/{m.maxScore}
              </Badge>
            </div>
            <Progress value={m.score} max={m.maxScore} />
            <span style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
              {m.detail}
            </span>
          </div>
        ))}
      </Stack>
    </Panel>
  );
}
