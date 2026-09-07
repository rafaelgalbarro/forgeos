import { LoadingState } from "@/components/ui/LoadingState";

export default function InvestmentLoading() {
  return (
    <LoadingState
      title="Loading Investment Hub…"
      description="Shell streaming — widgets load independently. ANALYSIS_ONLY · no orders."
    />
  );
}
