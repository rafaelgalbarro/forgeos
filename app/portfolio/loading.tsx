import { LoadingState } from "@/components/ui/LoadingState";

export default function PortfolioLoading() {
  return (
    <LoadingState
      title="Loading Portfolio Command Center…"
      description="Streaming quick view, ventures, value and resources."
    />
  );
}
