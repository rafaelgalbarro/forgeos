import { AiCommitteePageView } from "@/components/investment/AiCommitteePageView";

export const metadata = {
  title: "AI Committee",
  description: "ForgeOS Investment AI Committee — ANALYSIS_ONLY.",
};

export const dynamic = "force-dynamic";

type Params = { symbol?: string; risk?: string; analytics?: string; q?: string };

/** Primary AI Investment Committee route. */
export default async function InvestmentCommitteePage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  return <AiCommitteePageView searchParams={searchParams} />;
}
