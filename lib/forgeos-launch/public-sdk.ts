/** Program 7000 — Public SDK surface links */

import type { SdkLink } from "./types";

export const PUBLIC_SDK_LINKS: SdkLink[] = [
  {
    id: "sdk-overview",
    title: "ForgeOS SDK",
    summary: "Superficie de desarrollo para extensiones del ecosistema.",
    href: "/sdk",
    language: "TypeScript",
  },
  {
    id: "sdk-plugins",
    title: "Plugins & Marketplace",
    summary: "Publica y distribuye extensiones en el marketplace.",
    href: "/marketplace",
  },
  {
    id: "sdk-api-keys",
    title: "API Keys",
    summary: "Gestiona claves para integraciones comerciales.",
    href: "/api-keys",
  },
  {
    id: "sdk-docs",
    title: "Guía de integración",
    summary: "Quickstart para desarrolladores y partners.",
    href: "/docs/quickstart",
  },
];

export function listPublicSdkLinks(): SdkLink[] {
  return PUBLIC_SDK_LINKS;
}
