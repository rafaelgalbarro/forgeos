/** Program 7000 — Legal hub (privacy, terms, cookies, DPA) */

import { listLegalDocuments } from "@/lib/commercial/legal";
import type { LegalHubLink } from "./types";

export function getLegalHubLinks(): LegalHubLink[] {
  return listLegalDocuments().map((doc) => ({
    id: doc.id,
    title: doc.title,
    summary: doc.summary,
    href: doc.href,
    status: doc.status === "draft" ? "placeholder" : doc.status,
  }));
}

export function getReadyLegalLinks(): LegalHubLink[] {
  return getLegalHubLinks().filter((l) => l.status === "ready");
}

export const LEGAL_HUB_INTRO =
  "Documentación legal de ForgeOS 1.0. Algunos documentos están en preparación para el lanzamiento comercial.";
