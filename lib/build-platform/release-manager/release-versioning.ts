import type { SemanticVersion } from "./types";

const VERSION_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseSemanticVersion(input: string): SemanticVersion | null {
  const match = input.trim().match(VERSION_RE);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || undefined,
    buildMetadata: match[5] || undefined,
  };
}

export function formatSemanticVersion(version: SemanticVersion): string {
  let formatted = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) formatted += `-${version.prerelease}`;
  if (version.buildMetadata) formatted += `+${version.buildMetadata}`;
  return formatted;
}

export function createInitialVersion(prerelease = "rc.1"): SemanticVersion {
  return { major: 0, minor: 1, patch: 0, prerelease };
}

export function bumpMajor(version: SemanticVersion): SemanticVersion {
  return { major: version.major + 1, minor: 0, patch: 0 };
}

export function bumpMinor(version: SemanticVersion): SemanticVersion {
  return { major: version.major, minor: version.minor + 1, patch: 0 };
}

export function bumpPatch(version: SemanticVersion): SemanticVersion {
  return { major: version.major, minor: version.minor, patch: version.patch + 1 };
}

export function withPrerelease(
  version: SemanticVersion,
  prerelease: string,
): SemanticVersion {
  return { ...version, prerelease };
}

export function withBuildMetadata(
  version: SemanticVersion,
  buildMetadata: string,
): SemanticVersion {
  return { ...version, buildMetadata };
}

export function compareSemanticVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && !b.prerelease) return 0;

  const aParts = a.prerelease!.split(".");
  const bParts = b.prerelease!.split(".");
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i += 1) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;

    const aNum = Number(aPart);
    const bNum = Number(bPart);
    const aIsNum = !Number.isNaN(aNum);
    const bIsNum = !Number.isNaN(bNum);

    if (aIsNum && bIsNum && aNum !== bNum) return aNum - bNum;
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    if (aPart !== bPart) return aPart.localeCompare(bPart);
  }

  return 0;
}
