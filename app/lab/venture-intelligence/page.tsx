import type { Metadata } from "next";
import { VentureIntelligenceLabView } from "@/components/venture-intelligence/VentureIntelligenceLabView";

export const metadata: Metadata = {
  title: "Venture Intelligence Lab — ForgeOS",
  description: "RC8 — lab de motores de inteligencia de venture",
};

export default function VentureIntelligenceLabPage() {
  return <VentureIntelligenceLabView />;
}
