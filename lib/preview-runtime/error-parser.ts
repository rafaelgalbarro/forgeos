/** PROGRAM 5370 — Parse build/runtime errors. */

import type { PreviewErrorCategory, PreviewParsedError } from "./types";

const PATTERNS: { category: PreviewErrorCategory; regex: RegExp }[] = [
  { category: "dependency", regex: /npm ERR!|ERESOLVE|peer dep|Cannot find module '([^']+)'/i },
  { category: "typescript", regex: /error TS\d+:|Type '.*' is not assignable/i },
  { category: "syntax", regex: /SyntaxError:|Unexpected token/i },
  { category: "import", regex: /Module not found:|Can't resolve/i },
  { category: "build", regex: /Build failed|Failed to compile|next build/i },
  { category: "route", regex: /route|page not found|404/i },
  { category: "runtime", regex: /RuntimeError|Unhandled Runtime Error/i },
  { category: "hydration", regex: /Hydration failed|Text content does not match/i },
  { category: "network", regex: /ECONNREFUSED|ETIMEDOUT|fetch failed/i },
  { category: "environment", regex: /process\.env|environment variable/i },
  { category: "timeout", regex: /timed out|timeout/i },
  { category: "security", regex: /not allowed|blocked|forbidden/i },
];

const FILE_LINE_RE = /(?:at\s+)?(.+?):(\d+):(\d+)/;
const TS_ERROR_RE = /(.+?)\((\d+),(\d+)\):\s*error/;

export function parseErrorLine(line: string): PreviewParsedError {
  let category: PreviewErrorCategory = "build";
  for (const p of PATTERNS) {
    if (p.regex.test(line)) {
      category = p.category;
      break;
    }
  }

  let file: string | undefined;
  let lineNum: number | undefined;
  let column: number | undefined;

  const tsMatch = line.match(TS_ERROR_RE);
  if (tsMatch) {
    file = tsMatch[1];
    lineNum = Number(tsMatch[2]);
    column = Number(tsMatch[3]);
  } else {
    const flMatch = line.match(FILE_LINE_RE);
    if (flMatch) {
      file = flMatch[1];
      lineNum = Number(flMatch[2]);
      column = Number(flMatch[3]);
    }
  }

  return { category, message: line.trim(), file, line: lineNum, column, raw: line };
}

export function parseErrorOutput(stdout: string, stderr: string): PreviewParsedError[] {
  const combined = `${stdout}\n${stderr}`;
  const lines = combined.split(/\r?\n/).filter((l) => /error|ERR!|failed|Failed/i.test(l));
  const seen = new Set<string>();
  const errors: PreviewParsedError[] = [];

  for (const line of lines) {
    const key = line.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    errors.push(parseErrorLine(line));
  }

  return errors.slice(0, 50);
}

export function extractWarnings(output: string): string[] {
  return output
    .split(/\r?\n/)
    .filter((l) => /warn|warning|deprecated/i.test(l))
    .map((l) => l.trim())
    .slice(0, 30);
}
