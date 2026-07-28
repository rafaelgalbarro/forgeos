"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { InvestorPackage } from "@/lib/mission-control/investor-mode/types";
import { INVESTOR_MODE_VERSION } from "@/lib/mission-control/investor-mode";

const DataRoomView = dynamic(() => import("./DataRoomView").then((m) => m.DataRoomView), { ssr: false });
const InvestorDeckView = dynamic(() => import("./InvestorDeckView").then((m) => m.InvestorDeckView), { ssr: false });
const FinancialModelView = dynamic(() => import("./FinancialModelView").then((m) => m.FinancialModelView), { ssr: false });
const ValuationSummaryView = dynamic(() => import("./ValuationSummaryView").then((m) => m.ValuationSummaryView), { ssr: false });
const DueDiligenceChecklistView = dynamic(() => import("./DueDiligenceChecklistView").then((m) => m.DueDiligenceChecklistView), { ssr: false });
const InvestorFAQView = dynamic(() => import("./InvestorFAQView").then((m) => m.InvestorFAQView), { ssr: false });
const FundingPlanView = dynamic(() => import("./FundingPlanView").then((m) => m.FundingPlanView), { ssr: false });
const InvestorReadinessScoreView = dynamic(() => import("./InvestorReadinessScoreView").then((m) => m.InvestorReadinessScoreView), { ssr: false });

const TABS = [
  { id: "score", label: "Readiness" },
  { id: "dataRoom", label: "Data Room" },
  { id: "deck", label: "Deck" },
  { id: "financial", label: "Finanzas" },
  { id: "valuation", label: "Valoración" },
  { id: "dd", label: "Due Diligence" },
  { id: "faq", label: "FAQ" },
  { id: "funding", label: "Financiación" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  pkg: InvestorPackage;
  onClose?: () => void;
}

export function InvestorModePanel({ pkg, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("score");

  return (
    <div className="fhis-investor-mode-panel" style={{ marginTop: 16 }}>
      <Panel>
        <Stack gap="md">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionHeader
              title="Modo Inversor"
              subtitle={`${pkg.ventureName} · ${INVESTOR_MODE_VERSION}`}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge variant="accent">{pkg.readiness.score}%</Badge>
              {onClose && (
                <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={onClose}>
                  Cerrar
                </button>
              )}
            </div>
          </div>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`fhis-btn fhis-btn-sm ${tab === t.id ? "fhis-btn-primary" : "fhis-btn-ghost"}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {tab === "score" && <InvestorReadinessScoreView readiness={pkg.readiness} />}
          {tab === "dataRoom" && <DataRoomView docs={pkg.dataRoom} />}
          {tab === "deck" && <InvestorDeckView slides={pkg.deck} />}
          {tab === "financial" && <FinancialModelView model={pkg.financialModel} />}
          {tab === "valuation" && <ValuationSummaryView valuation={pkg.valuation} />}
          {tab === "dd" && <DueDiligenceChecklistView items={pkg.dueDiligence} />}
          {tab === "faq" && <InvestorFAQView items={pkg.faq} />}
          {tab === "funding" && <FundingPlanView plan={pkg.fundingPlan} />}
        </Stack>
      </Panel>
    </div>
  );
}
