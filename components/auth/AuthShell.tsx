"use client";

import Link from "next/link";
import { Container } from "@/components/ui/fhis/Layout";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="fhis-auth-page">
      <Container className="fhis-auth-container">
        <div className="fhis-auth-card">
          <Link href="/" className="fhis-auth-logo">
            ForgeOS
          </Link>
          <h1 className="fhis-auth-title">{title}</h1>
          {subtitle && <p className="fhis-auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </Container>
    </div>
  );
}
