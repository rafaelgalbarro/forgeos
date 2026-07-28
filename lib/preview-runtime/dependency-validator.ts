/** PROGRAM 5370 — Dependency validation before install. */

export interface DepValidationResult {
  allowed: boolean;
  blocked: string[];
  warnings: string[];
  packages: { name: string; version: string }[];
}

const HIGH_RISK_PACKAGES = new Set([
  "node-pre-gyp",
  "prebuild-install",
  "node-gyp",
  "sharp",
  "canvas",
  "sqlite3",
  "better-sqlite3",
  "puppeteer",
  "playwright",
]);

const SUSPICIOUS_POSTINSTALL = /postinstall.*(curl|wget|bash|sh\s|powershell)/i;

export function validateDependencies(
  dependencies: Record<string, string>,
  devDependencies?: Record<string, string>
): DepValidationResult {
  const all = { ...dependencies, ...devDependencies };
  const blocked: string[] = [];
  const warnings: string[] = [];
  const packages: { name: string; version: string }[] = [];

  for (const [name, version] of Object.entries(all)) {
    packages.push({ name, version });

    if (HIGH_RISK_PACKAGES.has(name)) {
      blocked.push(`${name}@${version} — high-risk native/binary package`);
      continue;
    }

    if (/^git(\+|:\/\/|\+ssh)/i.test(version) || /^github:/i.test(version)) {
      blocked.push(`${name}@${version} — git ref not allowed`);
      continue;
    }

    if (/^https?:\/\//i.test(version) || /^file:/i.test(version)) {
      blocked.push(`${name}@${version} — direct URL/local ref not allowed`);
      continue;
    }

    if (/^\.\.?\//.test(version)) {
      blocked.push(`${name}@${version} — local package outside sandbox`);
    }

    if (version.includes("latest") || version === "*") {
      warnings.push(`${name}: unpinned version ${version}`);
    }
  }

  return { allowed: blocked.length === 0, blocked, warnings, packages };
}

export function scanPackageJsonForPostinstall(content: string): string[] {
  const warnings: string[] = [];
  try {
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
    const postinstall = pkg.scripts?.postinstall ?? pkg.scripts?.preinstall ?? "";
    if (postinstall && SUSPICIOUS_POSTINSTALL.test(postinstall)) {
      warnings.push(`Suspicious postinstall script: ${postinstall.slice(0, 80)}`);
    }
  } catch {
    warnings.push("Could not parse package.json for postinstall scan");
  }
  return warnings;
}
