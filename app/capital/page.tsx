import type { Metadata } from "next";
import { CapitalDashboardView } from "@/components/venture-intelligence/CapitalDashboardView";

export const metadata: Metadata = {
  title: "Capital — ForgeOS",
  description: "Inteligencia financiera, estratégica e inversor — RC8 Venture Intelligence",
};

export default function CapitalPage() {
  return <CapitalDashboardView />;
}
