"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import styles from "@/styles/investment/workspace.module.css";

/** Primary product IA for ForgeOS Investment — one route per section. */
export const INVESTMENT_NAV_LINKS = [
  { id: "dashboard", href: "/investment", label: "Dashboard" },
  { id: "markets", href: "/investment/markets", label: "Markets" },
  { id: "opportunities", href: "/investment/opportunities", label: "Opportunities" },
  { id: "portfolio", href: "/investment/portfolio", label: "Portfolio" },
  { id: "orders", href: "/investment/orders", label: "Orders" },
  { id: "strategies", href: "/investment/strategies", label: "Strategies" },
  { id: "risk", href: "/investment/risk", label: "Risk" },
  { id: "news", href: "/investment/news", label: "News" },
  { id: "calendar", href: "/investment/calendar", label: "Calendar" },
  { id: "ai-committee", href: "/investment/ai-committee", label: "AI Committee" },
  { id: "reports", href: "/investment/reports", label: "Reports" },
  { id: "settings", href: "/investment/settings", label: "Settings" },
] as const;

export type InvestmentNavId = (typeof INVESTMENT_NAV_LINKS)[number]["id"];

/** Deep routes that should highlight a primary section without cluttering the main nav. */
const SECTION_ALIASES: Record<InvestmentNavId, readonly string[]> = {
  dashboard: ["/investment"],
  markets: ["/investment/markets", "/investment/screener", "/investment/scanner"],
  opportunities: ["/investment/opportunities", "/investment/alpha", "/investment/signals"],
  portfolio: ["/investment/portfolio"],
  orders: ["/investment/orders", "/investment/broker", "/investment/execution-control"],
  strategies: [
    "/investment/strategies",
    "/investment/strategy",
    "/investment/strategy-lab",
    "/investment/backtesting",
    "/investment/paper",
    "/investment/shadow",
    "/investment/live",
  ],
  risk: ["/investment/risk"],
  news: ["/investment/news", "/investment/research"],
  calendar: ["/investment/calendar"],
  "ai-committee": ["/investment/ai-committee", "/investment/committee", "/investment/ai-lab"],
  reports: ["/investment/reports", "/investment/performance", "/investment/compare", "/investment/audit"],
  settings: ["/investment/settings"],
};

function resolveActiveId(pathname: string): InvestmentNavId {
  const normalized = pathname.replace(/\/$/, "") || "/investment";
  if (normalized === "/investment") return "dashboard";

  let best: { id: InvestmentNavId; len: number } | null = null;
  for (const link of INVESTMENT_NAV_LINKS) {
    for (const href of SECTION_ALIASES[link.id]) {
      if (href === "/investment") continue;
      if (normalized === href || normalized.startsWith(`${href}/`)) {
        if (!best || href.length > best.len) best = { id: link.id, len: href.length };
      }
    }
  }
  return best?.id ?? "dashboard";
}

export function InvestmentWorkspaceNav({ active }: { active?: InvestmentNavId }) {
  const pathname = usePathname() ?? "/investment";
  const router = useRouter();
  const activeId = active ?? resolveActiveId(pathname);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const currentIndex = Math.max(
    0,
    INVESTMENT_NAV_LINKS.findIndex((l) => l.id === activeId),
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 72 || Math.abs(dy) > 48) return;
      if (dx < 0 && currentIndex < INVESTMENT_NAV_LINKS.length - 1) {
        router.push(INVESTMENT_NAV_LINKS[currentIndex + 1]!.href);
      } else if (dx > 0 && currentIndex > 0) {
        router.push(INVESTMENT_NAV_LINKS[currentIndex - 1]!.href);
      }
    },
    [currentIndex, router],
  );

  return (
    <div className={styles.navSwipeWrap} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <nav className={styles.workspaceNav} aria-label="ForgeOS Investment navigation">
        {INVESTMENT_NAV_LINKS.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className={activeId === link.id ? styles.workspaceNavActive : styles.workspaceNavLink}
            data-active={activeId === link.id ? "true" : "false"}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className={styles.navSwipeHint} aria-hidden="true">
        Desliza ← → entre secciones (móvil)
      </p>
    </div>
  );
}
