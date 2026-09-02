import { LoadingState } from "@/components/ui/LoadingState";

export default function LiveTradingLoading() {
  return (
    <LoadingState
      title="Loading Live Trading…"
      description="Supervised control surface — ANALYSIS_ONLY · LOCKED · no orders."
    />
  );
}
