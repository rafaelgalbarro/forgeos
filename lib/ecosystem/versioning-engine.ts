/** RC9 — Versioning engine (adapter + ecosystem versions). */

import { buildVersionInfo } from "@/lib/skills-store/versions";
import { getStoreItemById } from "@/lib/skills-store/registry";
import { getEcosystemPackById } from "./catalog";
import type { VersionRecord } from "./types";

const ECOSYSTEM_VERSIONS: Record<string, VersionRecord[]> = {
  "eco-pack-crm": [
    {
      packId: "eco-pack-crm",
      semver: "1.2.0",
      changelog: ["Nuevo reporting CEO", "Plugin CRM Sync integrado", "Mejoras de pipeline"],
      releasedAt: "2026-07-01T10:00:00.000Z",
      compatibleWith: ["forgeos>=0.9", "hubspot-skill>=1.0"],
    },
    {
      packId: "eco-pack-crm",
      semver: "1.1.0",
      changelog: ["Automatización de contactos", "Fix dependencias email"],
      releasedAt: "2026-05-15T08:00:00.000Z",
      compatibleWith: ["forgeos>=0.8"],
    },
    {
      packId: "eco-pack-crm",
      semver: "1.0.0",
      changelog: ["Lanzamiento inicial CRM Pack"],
      releasedAt: "2026-04-01T12:00:00.000Z",
      compatibleWith: ["forgeos>=0.7"],
    },
  ],
};

export function getPackVersions(packId: string): VersionRecord[] {
  const pack = getEcosystemPackById(packId);
  if (ECOSYSTEM_VERSIONS[packId]) return ECOSYSTEM_VERSIONS[packId];
  if (pack?.skillStoreItemId) {
    const item = getStoreItemById(pack.skillStoreItemId);
    if (item) {
      const v = buildVersionInfo(item);
      return [
        {
          packId,
          semver: v.semver,
          changelog: v.changelog,
          releasedAt: v.releasedAt,
          compatibleWith: v.compatibleWith,
        },
      ];
    }
  }
  return [
    {
      packId,
      semver: pack?.version ?? "1.0.0",
      changelog: ["Versión actual"],
      releasedAt: pack?.updatedAt ?? new Date().toISOString(),
      compatibleWith: ["forgeos>=0.9"],
    },
  ];
}

export function getLatestVersion(packId: string): VersionRecord | undefined {
  const versions = getPackVersions(packId);
  return versions[0];
}

export function isVersionCompatible(packId: string, forgeosVersion: string): boolean {
  const latest = getLatestVersion(packId);
  if (!latest) return true;
  const req = latest.compatibleWith.find((c) => c.startsWith("forgeos>="));
  if (!req) return true;
  const min = req.replace("forgeos>=", "");
  return forgeosVersion >= min;
}
