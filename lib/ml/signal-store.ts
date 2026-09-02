/**
 * Phase H — file-backed ML signal store (JSONL under `.forgeos/ml/`).
 *
 * Storage choice: JSONL (not better-sqlite3 / node:sqlite) for clean Windows installs.
 * Upgrade path: mirror schema into SQLite later; keep the same MlSignalRecord shape.
 */

import "server-only";

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { MlModelState, MlScannerWeights, MlSignalRecord } from "@/lib/ml/types";

export const ML_DIR_REL = path.join(".forgeos", "ml");
export const SIGNALS_JSONL_REL = path.join(ML_DIR_REL, "signals.jsonl");
export const MODEL_JSON_REL = path.join(ML_DIR_REL, "model.json");
export const SCANNER_WEIGHTS_REL = path.join(ML_DIR_REL, "scanner-weights.json");
export const TRAIN_META_REL = path.join(ML_DIR_REL, "train-meta.json");

export type MlTrainMeta = {
  lastTrainedAt: string | null;
  lastTrainAttemptAt: string | null;
  modelVersion: number;
};

const DEFAULT_META: MlTrainMeta = {
  lastTrainedAt: null,
  lastTrainAttemptAt: null,
  modelVersion: 0,
};

function mlDir(cwd = process.cwd()): string {
  return path.join(cwd, ML_DIR_REL);
}

export function getMlSignalsPath(cwd = process.cwd()): string {
  return path.join(cwd, SIGNALS_JSONL_REL);
}

export function getMlModelPath(cwd = process.cwd()): string {
  return path.join(cwd, MODEL_JSON_REL);
}

export function getScannerWeightsPath(cwd = process.cwd()): string {
  return path.join(cwd, SCANNER_WEIGHTS_REL);
}

export function getTrainMetaPath(cwd = process.cwd()): string {
  return path.join(cwd, TRAIN_META_REL);
}

function ensureMlDir(cwd = process.cwd()): void {
  const dir = mlDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(tmp, filePath);
}

export function appendSignalRecord(record: MlSignalRecord, cwd = process.cwd()): void {
  ensureMlDir(cwd);
  appendFileSync(getMlSignalsPath(cwd), `${JSON.stringify(record)}\n`, "utf8");
}

export function loadAllSignalRecords(cwd = process.cwd()): MlSignalRecord[] {
  const file = getMlSignalsPath(cwd);
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  if (!raw.trim()) return [];
  const out: MlSignalRecord[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as MlSignalRecord);
    } catch {
      /* skip corrupt line */
    }
  }
  return out;
}

/**
 * Rewrite the full JSONL after in-memory updates (e.g. labeling outcomes).
 * Keeps append-friendly store but allows outcome patching by id.
 */
export function rewriteSignalRecords(records: readonly MlSignalRecord[], cwd = process.cwd()): void {
  ensureMlDir(cwd);
  const file = getMlSignalsPath(cwd);
  const body = records.map((r) => JSON.stringify(r)).join("\n");
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, body ? `${body}\n` : "", "utf8");
  renameSync(tmp, file);
}

export function loadModelState(cwd = process.cwd()): MlModelState | null {
  const file = getMlModelPath(cwd);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as MlModelState;
  } catch {
    return null;
  }
}

export function saveModelState(state: MlModelState, cwd = process.cwd()): void {
  atomicWriteJson(getMlModelPath(cwd), state);
}

export function loadScannerWeights(cwd = process.cwd()): MlScannerWeights | null {
  const file = getScannerWeightsPath(cwd);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as MlScannerWeights;
  } catch {
    return null;
  }
}

export function saveScannerWeights(weights: MlScannerWeights, cwd = process.cwd()): void {
  atomicWriteJson(getScannerWeightsPath(cwd), weights);
}

export function loadTrainMeta(cwd = process.cwd()): MlTrainMeta {
  const file = getTrainMetaPath(cwd);
  if (!existsSync(file)) return { ...DEFAULT_META };
  try {
    return { ...DEFAULT_META, ...(JSON.parse(readFileSync(file, "utf8")) as Partial<MlTrainMeta>) };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function saveTrainMeta(meta: MlTrainMeta, cwd = process.cwd()): void {
  atomicWriteJson(getTrainMetaPath(cwd), meta);
}

export function newSignalId(ticker: string, at = new Date()): string {
  const iso = at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const rand = Math.random().toString(16).slice(2, 8);
  return `sig_${ticker}_${iso}_${rand}`;
}
