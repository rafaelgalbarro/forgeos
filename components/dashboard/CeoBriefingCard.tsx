import Link from "next/link";
import type { CEOBriefing } from "@/lib/portfolio/types";
import { AiConversation } from "@/components/ui/fhis/AiConversation";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { cn } from "@/lib/design-system/cn";

interface CeoBriefingCardProps {
  briefing: CEOBriefing;
}

export function CeoBriefingCard({ briefing }: CeoBriefingCardProps) {
  const messages = [
    { role: "assistant" as const, content: `${briefing.greeting} ${briefing.openingLine}` },
    { role: "assistant" as const, content: briefing.observation },
    { role: "assistant" as const, content: briefing.recommendation },
    { role: "assistant" as const, content: briefing.expectedImpact },
  ];

  return (
    <Panel className="fhis-ceo-briefing" id="dashboard-ceo">
      <div className="fhis-ceo-briefing-head">
        <div className="fhis-ceo-briefing-avatar" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="fhis-section-header-title" style={{ fontSize: "var(--fhis-text-lg)", margin: 0 }}>
            CEO AI
          </h2>
          <Status status="active" label="En conversación" />
        </div>
      </div>

      <AiConversation messages={messages} />

      <div className="fhis-ceo-briefing-insights">
        <div className="fhis-ceo-briefing-insight">
          <Badge variant="amber">⚠</Badge>
          <div>
            <span className="fhis-ceo-briefing-insight-label">Riesgo crítico</span>
            <p style={{ margin: 0, fontSize: "var(--fhis-text-sm)" }}>{briefing.criticalRisk}</p>
          </div>
        </div>
        <div className="fhis-ceo-briefing-insight">
          <Badge variant="blue">→</Badge>
          <div>
            <span className="fhis-ceo-briefing-insight-label">Recomendación</span>
            <p style={{ margin: 0, fontSize: "var(--fhis-text-sm)" }}>{briefing.recommendation}</p>
          </div>
        </div>
        <div className="fhis-ceo-briefing-insight">
          <Badge variant="accent">◆</Badge>
          <div>
            <span className="fhis-ceo-briefing-insight-label">Impacto esperado</span>
            <p style={{ margin: 0, fontSize: "var(--fhis-text-sm)" }}>{briefing.expectedImpact}</p>
          </div>
        </div>
      </div>

      <Link href={briefing.ctaHref} className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
        Ver análisis completo
      </Link>
    </Panel>
  );
}
