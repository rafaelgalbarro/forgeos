"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { Container } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

const DP_LINKS = [
  { href: "/design-partners", label: "Dashboard" },
  { href: "/customer-success", label: "Customer Success" },
  { href: "/analytics", label: "Analytics" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/feedback", label: "Feedback" },
];

interface DesignPartnerShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function DesignPartnerShell({ title, description, children }: DesignPartnerShellProps) {
  const pathname = usePathname() ?? "";

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />
      <Container className="fhis-beta-dashboard">
        <SectionHeader title={title} description={description} />
        <div className="fhis-beta-dashboard-header">
          <Badge variant="accent">Program 5000 · Design Partners</Badge>
        </div>
        <nav className="fhis-beta-tabs">
          {DP_LINKS.map((link) => (
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
