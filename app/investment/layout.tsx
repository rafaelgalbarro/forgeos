import type { Metadata, Viewport } from "next";
import { InvestmentProductShell } from "@/components/investment/InvestmentProductShell";
import "@/styles/investment/investment-fonts.css";

// Temporary build detection — confirms Next includes /investment in production compile
console.log("[ForgeOS build] app/investment/layout.tsx registered — /investment route active");

export const metadata: Metadata = {
  title: {
    default: "ForgeOS Investment",
    template: "%s — ForgeOS Investment",
  },
  description: "ForgeOS Investment — AI Investment Operating System. ANALYSIS_ONLY, no order execution.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ForgeOS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function InvestmentLayout({ children }: { children: React.ReactNode }) {
  return <InvestmentProductShell>{children}</InvestmentProductShell>;
}
