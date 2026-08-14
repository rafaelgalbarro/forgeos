"use client";

import { usePathname } from "next/navigation";
import { ForgeOSShell } from "@/components/os/ForgeOSShell";
import { ForgeCommandPalette } from "@/components/experience/ForgeCommandPalette";
import { Sidebar } from "./Sidebar";

const IMMERSIVE_PREFIXES = [
  "/build",
  "/venture",
  "/intelligence",
  "/founder-journey",
  "/creator",
  "/landing",
  "/pricing",
  "/onboarding",
  "/docs",
  "/beta",
  "/waitlist",
  "/feedback",
  "/status",
  "/support",
  "/privacy",
  "/security",
  "/login",
  "/register",
  "/forgot-password",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isOs =
    pathname === "/os" ||
    pathname.startsWith("/os/") ||
    pathname === "/command-center" ||
    pathname === "/labs" ||
    pathname.startsWith("/ventures/");
  const isDashboard = pathname === "/dashboard" || pathname === "/founder";
  const isInvestment = pathname === "/investment" || pathname.startsWith("/investment/");
  const immersive =
    pathname === "/" ||
    IMMERSIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isOs) {
    return <ForgeOSShell>{children}</ForgeOSShell>;
  }

  if (isInvestment) {
    return <div className="investment-app-root">{children}</div>;
  }

  if (immersive) {
    return <div className="immersive-root">{children}</div>;
  }

  return (
    <div className="shell">
      <Sidebar />
      <main className={isDashboard ? "main main-dashboard" : "main"}>{children}</main>
      <ForgeCommandPalette />
    </div>
  );
}
