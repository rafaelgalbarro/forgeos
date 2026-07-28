import type { Metadata } from "next";
import { BetaDashboard } from "@/components/beta-platform/BetaDashboard";

export const metadata: Metadata = {
  title: "Beta Dashboard — ForgeOS",
  description: "Hub central para usuarios beta — waitlist, invitaciones, feature flags y analytics.",
};

export default function BetaRoute() {
  return <BetaDashboard />;
}
