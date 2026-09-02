import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { InvestmentProductShell } from "@/components/investment/InvestmentProductShell";
import { RegisterInvestmentServiceWorker } from "@/components/investment/RegisterInvestmentServiceWorker";
import "@/styles/investment/investment-fonts.css";
import "@/styles/investment/terminal-theme.css";

const investmentSans = Inter({
  subsets: ["latin"],
  variable: "--font-investment-sans",
  display: "swap",
});

const investmentMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-investment-mono",
  display: "swap",
});

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
    title: "ForgeOS Investment",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0e17",
};

export default function InvestmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${investmentSans.variable} ${investmentMono.variable}`}>
      <InvestmentProductShell>
        <RegisterInvestmentServiceWorker />
        {children}
      </InvestmentProductShell>
    </div>
  );
}
