"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { Container } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

const CS_LINKS = [
  { href: "/customer-success", label: "Centro CS" },
  { href: "/product-analytics", label: "Producto" },
  { href: "/nps", label: "NPS" },
  { href: "/feedback-center", label: "Feedback" },
  { href: "/executive-insights", label: "Insights CEO" },
  { href: "/design-partners", label: "Design Partners" },
];

interface CustomerSuccessShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function CustomerSuccessShell({ title, description, children }: CustomerSuccessShellProps) {
  const pathname = usePathname() ?? "";

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />
      <Container className="fhis-beta-dashboard">
        <SectionHeader title={title} description={description} />
        <div className="fhis-beta-dashboard-header">
          <Badge variant="accent">Program 8000 · Customer Success</Badge>
        </div>
        <nav className="fhis-beta-tabs">
          {CS_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`fhis-btn fhis-btn-sm ${pathname === link.href ? "fhis-btn-primary" : "fhis-btn-ghost"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {children}
      </Container>
    </div>
  );
}
