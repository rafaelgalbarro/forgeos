import { AiCommitteePageView } from "@/components/investment/AiCommitteePageView";

export const metadata = {
  title: "AI Committee",
  description: "ForgeOS Investment AI Committee — ANALYSIS_ONLY (alias of /investment/committee).",
};

export const dynamic = "force-dynamic";

type Params = { symbol?: string; risk?: string; analytics?: string; q?: string };

/** Alias kept in sync with /investment/committee via shared AiCommitteePageView. */
export default async function InvestmentAiCommitteePage({
  searchParams,
}: {
  searchParams?: Promise<Params> | Params;
}) {
  return <AiCommitteePageView searchParams={searchParams} />;
}
