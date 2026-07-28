/** ForgeOS Universal Skill Store — version management (RC4.8). */

import type { StoreItem, VersionInfo } from "./types";

const NOW = "2026-07-06T00:00:00.000Z";

export function parseSemver(version: string): [number, number, number] {
  const parts = version.replace(/^v/, "").split(".").map((p) => parseInt(p, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareSemver(a: string, b: string): number {
  const [ma, mi, pa] = parseSemver(a);
  const [mb, mj, pb] = parseSemver(b);
  if (ma !== mb) return ma - mb;
  if (mi !== mj) return mi - mj;
  return pa - pb;
}

export function isCompatible(installed: string, required: string): boolean {
  const [iM, iMi] = parseSemver(installed);
  const [rM, rMi] = parseSemver(required);
  return iM === rM && iMi >= rMi;
}

function defaultChangelog(name: string, version: string): string[] {
  return [
    `${name} v${version} — initial store release`,
    "Integrated with ForgeOS Skills Governance",
    "Sandbox mock execution enabled",
  ];
}

export function buildVersionInfo(item: StoreItem): VersionInfo {
  const itemCategory =
    item.category === "versions" || item.category === "dependencies"
      ? "skills"
      : item.category;

  return {
    id: `ver-${item.id}`,
    name: `${item.name} v${item.version}`,
    category: "versions",
    version: item.version,
    description: `Version record for ${item.name}`,
    tags: ["version", itemCategory, ...item.tags.slice(0, 2)],
    source: item.source,
    updatedAt: item.updatedAt,
    status: item.status,
    itemId: item.id,
    itemCategory,
    semver: item.version,
    changelog: defaultChangelog(item.name, item.version),
    releasedAt: NOW,
    compatibleWith: ["forgeos-rc4.8+"],
  };
}

export function buildAllVersions(items: StoreItem[]): VersionInfo[] {
  return items
    .filter((i) => i.category !== "versions" && i.category !== "dependencies")
    .map(buildVersionInfo);
}

export function getLatestVersion(versions: VersionInfo[], itemId: string): VersionInfo | undefined {
  const forItem = versions.filter((v) => v.itemId === itemId);
  if (forItem.length === 0) return undefined;
  return forItem.sort((a, b) => compareSemver(b.semver, a.semver))[0];
}
