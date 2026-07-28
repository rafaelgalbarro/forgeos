import Link from "next/link";
import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { resolveWorkspaceNextActions } from "@/lib/venture-workspace";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import { Stack } from "@/components/ui/fhis/Layout";
import { cn } from "@/lib/design-system/cn";

interface NextActionsSectionProps {
  data: VentureWorkspaceSnapshot;
}

const PRIORITY_VARIANT = {
  alta: "amber" as const,
  media: "blue" as const,
  baja: "default" as const,
};

export function NextActionsSection({ data }: NextActionsSectionProps) {
  const actions = resolveWorkspaceNextActions(data.venture);
  return (
    <Panel id="next-actions" className="fhis-vws-section">
      <SectionHeader title="Próximas acciones" subtitle="Recomendaciones basadas en el estado del venture" />
      <Stack gap="md">
        {actions.map((action, i) => (
          <Card key={`${action.label}-${i}`} variant="ghost" padding="md">
            <div className="fhis-vws-action-head">
              <Badge variant={PRIORITY_VARIANT[action.priority]}>{action.priority}</Badge>
              <strong>{action.label}</strong>
            </div>
            <p className="fhis-vws-prose">{action.description}</p>
            <p style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
              Impacto: {action.impact}
            </p>
            <Link href={action.href} className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
              Continuar
            </Link>
          </Card>
        ))}
      </Stack>
    </Panel>
  );
}
