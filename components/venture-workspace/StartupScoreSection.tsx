import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Progress } from "@/components/ui/fhis/Progress";
import { Grid } from "@/components/ui/fhis/Layout";
import { cn } from "@/lib/design-system/cn";

interface StartupScoreSectionProps {
  data: VentureWorkspaceSnapshot;
}

export function StartupScoreSection({ data }: StartupScoreSectionProps) {
  const { startupScore, ventureScore } = data;
  return (
    <Panel id="startup-score" className="fhis-vws-section">
      <SectionHeader title="Startup Score" subtitle="Potencial y viabilidad del venture" />
      <Grid cols={2} gap="lg">
        <div>
          <KpiBlock
            label="Startup Score"
            value={startupScore.display}
            className={cn(startupScore.pending && "fhis-vpc-score-pending")}
          />
          <span className="fhis-vpc-score-label">{startupScore.label}</span>
          {!startupScore.pending && startupScore.value !== null && (
            <Progress value={startupScore.value} label="Potencial" showValue />
          )}
        </div>
        <div>
          <KpiBlock
            label="Venture Score"
            value={ventureScore.display}
            className={cn(ventureScore.pending && "fhis-vpc-score-pending")}
          />
          <span className="fhis-vpc-score-label">{ventureScore.label}</span>
          {!ventureScore.pending && ventureScore.value !== null && (
            <Progress value={ventureScore.value} label="Simulación" showValue />
          )}
        </div>
      </Grid>
    </Panel>
  );
}
