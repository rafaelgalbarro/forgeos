/** Program 6000 — Legal documents (privacy, terms, GDPR placeholders) */

import type { LegalDocument } from "./types";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "privacy",
    title: "Política de privacidad",
    slug: "privacy",
    summary: "Cómo recopilamos, usamos y protegemos tus datos.",
    href: "/privacy",
    status: "ready",
  },
  {
    id: "terms",
    title: "Términos de servicio",
    slug: "terms",
    summary: "Condiciones de uso de ForgeOS como SaaS.",
    href: "/docs/commercial-terms",
    status: "placeholder",
  },
  {
    id: "cookies",
    title: "Política de cookies",
    slug: "cookies",
    summary: "Uso de cookies y tecnologías similares.",
    href: "/docs/commercial-cookies",
    status: "placeholder",
  },
  {
    id: "dpa",
    title: "Acuerdo de procesamiento de datos (DPA)",
    slug: "dpa",
    summary: "Para clientes Business y Enterprise.",
    href: "/docs/commercial-dpa",
    status: "placeholder",
  },
  {
    id: "security",
    title: "Seguridad",
    slug: "security",
    summary: "Prácticas de seguridad y certificaciones.",
    href: "/security",
    status: "ready",
  },
  {
    id: "soc2",
    title: "SOC 2 Ready",
    slug: "soc2",
    summary: "Controles y roadmap hacia certificación SOC 2.",
    href: "/docs/commercial-soc2",
    status: "placeholder",
  },
  {
    id: "gdpr",
    title: "GDPR",
    slug: "gdpr",
    summary: "Cumplimiento RGPD para usuarios en la UE.",
    href: "/docs/commercial-gdpr",
    status: "placeholder",
  },
];

export function listLegalDocuments(): LegalDocument[] {
  return LEGAL_DOCUMENTS;
}

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((d) => d.slug === slug);
}
