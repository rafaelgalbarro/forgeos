import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/LoadingState";

const LiveOperationsCenter = dynamic(
  () =>
    import("@/components/live-ai/LiveOperationsCenter").then((m) => ({
      default: m.LiveOperationsCenter,
    })),
  {
    loading: () => (
      <LoadingState title="Cargando Live Operations…" description="Live AI — lazy load" />
    ),
  }
);

export const metadata = {
  title: "Live — ForgeOS",
  description: "Live AI Operations Center — RC6 real telemetry + RC5.5 simulation",
};

export default function LivePage() {
  return <LiveOperationsCenter />;
}
