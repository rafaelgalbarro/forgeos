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
          <div className="fhis-auth-brand">
            <span className="fhis-auth-logo" aria-hidden>
              ◆
            </span>
            <div>
              <p className="fhis-auth-product">ForgeOS Investment</p>
              <p className="fhis-auth-private">Plataforma privada — acceso restringido</p>
            </div>
          </div>
          <h1 className="fhis-auth-title">{title}</h1>
          {subtitle && <p className="fhis-auth-subtitle">{subtitle}</p>}
          {children}
          <p className="fhis-auth-footer">
            <Link href="/login">ForgeOS</Link> · Founder only
          </p>
        </div>
      </Container>
    </div>
  );
}
