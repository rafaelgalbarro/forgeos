import Link from "next/link";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";

interface LegacyConsolidationBannerProps {
  from?: string;
}

export function LegacyConsolidationBanner({ from }: LegacyConsolidationBannerProps) {
  return (
    <Panel className="fhis-fj-legacy-banner">
      <Badge variant="accent">Vista legacy</Badge>
      <p>
        Esta vista se ha consolidado en Command Center
        {from ? ` (antes: ${from})` : ""}.
      </p>
      <Link href="/command-center" className="fhis-btn fhis-btn-sm fhis-btn-primary">
        Ir a Command Center →
      </Link>
    </Panel>
  );
}
