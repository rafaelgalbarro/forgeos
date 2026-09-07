/**
 * Append-only Morning Briefing storage under `.forgeos/reports/`.
 * Never mutates prior report folders; history is JSONL append-only.
 */

import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  MorningBriefingDocument,
  MorningBriefingEmailPayload,
  MorningBriefingEmailStatus,
  MorningBriefingHistoryEntry,
} from "./morning-briefing.types";
import { MORNING_BRIEFING_TYPE } from "./morning-briefing.types";

export const REPORTS_ROOT_REL = path.join(".forgeos", "reports");
export const MORNING_BRIEFING_DIR_REL = path.join(REPORTS_ROOT_REL, "morning-briefing");
export const HISTORY_JSONL_REL = path.join(REPORTS_ROOT_REL, "history.jsonl");

function reportsRoot(cwd = process.cwd()): string {
  return path.join(cwd, REPORTS_ROOT_REL);
}

export function getMorningBriefingReportsRoot(cwd = process.cwd()): string {
  return path.join(cwd, MORNING_BRIEFING_DIR_REL);
}

export function getReportsHistoryPath(cwd = process.cwd()): string {
  return path.join(cwd, HISTORY_JSONL_REL);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Stable id: morning-briefing-YYYYMMDDTHHMMSSZ */
export function buildMorningBriefingId(generatedAt: Date = new Date()): string {
  const iso = generatedAt.toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${MORNING_BRIEFING_TYPE}-${iso.replace(/[-:]/g, "").replace("T", "T")}`;
}

function folderNameFromId(id: string): string {
  return id.replace(/^morning-briefing-/, "");
}

export type PersistMorningBriefingInput = {
  readonly document: MorningBriefingDocument;
  readonly pdfBytes: Uint8Array;
  readonly emailStatus: MorningBriefingEmailStatus;
  readonly emailTo: string;
  readonly emailPayload?: MorningBriefingEmailPayload | null;
  readonly cwd?: string;
};

export type PersistMorningBriefingResult = {
  readonly historyEntry: MorningBriefingHistoryEntry;
  readonly pdfAbsolutePath: string;
  readonly jsonAbsolutePath: string;
  readonly emailPayloadAbsolutePath: string | null;
  readonly reportDirAbsolute: string;
};

/**
 * Write a new immutable report folder + append one history.jsonl line.
 * Does not overwrite existing report directories (throws if collision).
 */
export function persistMorningBriefing(
  input: PersistMorningBriefingInput,
): PersistMorningBriefingResult {
  const cwd = input.cwd ?? process.cwd();
  const root = reportsRoot(cwd);
  const typeDir = path.join(cwd, MORNING_BRIEFING_DIR_REL);
  ensureDir(root);
  ensureDir(typeDir);

  const folder = folderNameFromId(input.document.id);
  const reportDir = path.join(typeDir, folder);
  if (existsSync(reportDir)) {
    throw new Error(`Morning briefing already exists (immutable): ${reportDir}`);
  }
  ensureDir(reportDir);

  const jsonName = "briefing.json";
  const pdfName = "morning-briefing.pdf";
  const jsonAbsolutePath = path.join(reportDir, jsonName);
  const pdfAbsolutePath = path.join(reportDir, pdfName);

  writeFileSync(jsonAbsolutePath, `${JSON.stringify(input.document, null, 2)}\n`, "utf8");
  writeFileSync(pdfAbsolutePath, input.pdfBytes);

  let emailPayloadAbsolutePath: string | null = null;
  if (input.emailPayload) {
    emailPayloadAbsolutePath = path.join(reportDir, "email-payload.json");
    writeFileSync(
      emailPayloadAbsolutePath,
      `${JSON.stringify(input.emailPayload, null, 2)}\n`,
      "utf8",
    );
  }

  const jsonRelativePath = path
    .join(MORNING_BRIEFING_DIR_REL, folder, jsonName)
    .split(path.sep)
    .join("/");
  const pdfRelativePath = path
    .join(MORNING_BRIEFING_DIR_REL, folder, pdfName)
    .split(path.sep)
    .join("/");

  const historyEntry: MorningBriefingHistoryEntry = {
    id: input.document.id,
    type: MORNING_BRIEFING_TYPE,
    generatedAt: input.document.generatedAt,
    briefingDate: input.document.briefingDate,
    pdfRelativePath,
    jsonRelativePath,
    emailStatus: input.emailStatus,
    emailTo: input.emailTo,
    immutable: true,
  };

  const historyPath = getReportsHistoryPath(cwd);
  appendFileSync(historyPath, `${JSON.stringify(historyEntry)}\n`, "utf8");

  return {
    historyEntry,
    pdfAbsolutePath,
    jsonAbsolutePath,
    emailPayloadAbsolutePath,
    reportDirAbsolute: reportDir,
  };
}

/** Read append-only history (newest last). Filters to morning-briefing by default. */
export function listMorningBriefingHistory(options?: {
  readonly cwd?: string;
  readonly limit?: number;
  readonly typeOnly?: boolean;
}): readonly MorningBriefingHistoryEntry[] {
  const cwd = options?.cwd ?? process.cwd();
  const historyPath = getReportsHistoryPath(cwd);
  if (!existsSync(historyPath)) return [];

  const lines = readFileSync(historyPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: MorningBriefingHistoryEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Partial<MorningBriefingHistoryEntry>;
      if (options?.typeOnly === false) {
        // allow all types when shared history grows
      } else if (parsed.type !== MORNING_BRIEFING_TYPE) {
        continue;
      }
      if (typeof parsed.id !== "string" || typeof parsed.generatedAt !== "string") continue;
      entries.push({
        id: parsed.id,
        type: MORNING_BRIEFING_TYPE,
        generatedAt: parsed.generatedAt,
        briefingDate: typeof parsed.briefingDate === "string" ? parsed.briefingDate : "NO_DATA",
        pdfRelativePath:
          typeof parsed.pdfRelativePath === "string" ? parsed.pdfRelativePath : "NO_DATA",
        jsonRelativePath:
          typeof parsed.jsonRelativePath === "string" ? parsed.jsonRelativePath : "NO_DATA",
        emailStatus: (parsed.emailStatus as MorningBriefingEmailStatus) ?? "QUEUED",
        emailTo: typeof parsed.emailTo === "string" ? parsed.emailTo : "NO_DATA",
        immutable: true,
      });
    } catch {
      // skip corrupt lines — history remains append-only
    }
  }

  const limit = options?.limit;
  if (limit != null && limit > 0) return entries.slice(-limit);
  return entries;
}

export function loadMorningBriefingDocument(
  id: string,
  cwd = process.cwd(),
): MorningBriefingDocument | null {
  const folder = folderNameFromId(id);
  const jsonPath = path.join(cwd, MORNING_BRIEFING_DIR_REL, folder, "briefing.json");
  if (!existsSync(jsonPath)) return null;
  try {
    return JSON.parse(readFileSync(jsonPath, "utf8")) as MorningBriefingDocument;
  } catch {
    return null;
  }
}
