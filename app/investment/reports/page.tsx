import { DailyPdfReportsPanel } from "@/components/investment/DailyPdfReportsPanel";
import { MorningBriefingReportsPanel } from "@/components/investment/MorningBriefingReportsPanel";
import { ReportsCenterDashboard } from "@/components/investment/ReportsCenterDashboard";
import { getReportsCenterSnapshot } from "@/lib/investment/reports-generator";

export const metadata = {
  title: "Reports",
  description:
    "ForgeOS Investment reports hub — daily PDF, period archive, morning briefing. ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

export default async function InvestmentReportsPage() {
  const initial = await getReportsCenterSnapshot({ autoEnsure: false, filters: { limit: 100 } });

  return (
    <div>
      <DailyPdfReportsPanel />
      <MorningBriefingReportsPanel />
      <ReportsCenterDashboard initial={initial} />
    </div>
  );
}
