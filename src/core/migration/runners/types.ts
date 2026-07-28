/**
 * PROGRAM 6070 — Idempotent data migration helpers.
 * Before: backup, count, checksum, schema check.
 * After: count, checksum, relationship validation, orphan detection, report.
 */

import type {
  DataMigrationPostCheck,
  DataMigrationPreCheck,
  DataMigrationReport,
  MigrationComponentId,
} from "../types";

/** Deterministic non-crypto checksum (Node + bundler safe). */
export function checksumRecords(records: Array<Record<string, unknown>>): string {
  const normalized = records
    .map((r) => JSON.stringify(r, Object.keys(r).sort()))
    .sort()
    .join("\n");
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function schemaCheck(
  records: Array<Record<string, unknown>>,
  requiredKeys: string[],
): { ok: boolean; notes: string[] } {
  const notes: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    for (const key of requiredKeys) {
      if (r[key] === undefined || r[key] === null || r[key] === "") {
        notes.push(`row[${i}] missing ${key}`);
      }
    }
  }
  return { ok: notes.length === 0, notes };
}

export interface MigratorContext<TLegacy, TV2> {
  component: MigrationComponentId;
  dryRun: boolean;
  backupPath?: string | null;
  requiredLegacyKeys: string[];
  loadLegacy: () => Promise<TLegacy[]> | TLegacy[];
  loadV2: () => Promise<TV2[]> | TV2[];
  toV2: (legacy: TLegacy) => TV2;
  getId: (row: TLegacy | TV2) => string;
  writeV2: (row: TV2) => Promise<void> | void;
  /** Relationship validation: return orphan ids. */
  findOrphans?: (v2: TV2[]) => string[];
}

export async function runIdempotentMigrator<TLegacy extends Record<string, unknown>, TV2 extends Record<string, unknown>>(
  ctx: MigratorContext<TLegacy, TV2>,
): Promise<DataMigrationReport> {
  const startedAt = new Date().toISOString();
  const messages: string[] = [];
  const legacy = await ctx.loadLegacy();
  const legacyPlain = legacy as Array<Record<string, unknown>>;
  const schema = schemaCheck(legacyPlain, ctx.requiredLegacyKeys);

  const pre: DataMigrationPreCheck = {
    backupPath: ctx.backupPath ?? null,
    legacyCount: legacy.length,
    legacyChecksum: checksumRecords(legacyPlain),
    schemaOk: schema.ok,
    schemaNotes: schema.notes,
  };

  if (!schema.ok) {
    messages.push("schema_check_failed — aborting before write");
    const existingV2 = await ctx.loadV2();
    const post: DataMigrationPostCheck = {
      v2Count: existingV2.length,
      v2Checksum: checksumRecords(existingV2 as Array<Record<string, unknown>>),
      relationshipOk: false,
      orphans: [],
      notes: ["aborted"],
    };
    return {
      component: ctx.component,
      dryRun: ctx.dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      pre,
      post,
      migrated: 0,
      skipped: 0,
      failed: legacy.length,
      idempotent: true,
      ok: false,
      messages,
    };
  }

  const existingV2 = await ctx.loadV2();
  const existingIds = new Set(existingV2.map((r) => ctx.getId(r)));
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of legacy) {
    const id = ctx.getId(row);
    if (existingIds.has(id)) {
      skipped += 1;
      continue;
    }
    try {
      const v2Row = ctx.toV2(row);
      if (!ctx.dryRun) {
        await ctx.writeV2(v2Row);
      }
      existingIds.add(id);
      migrated += 1;
    } catch (err) {
      failed += 1;
      messages.push(`fail ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const finalV2 = ctx.dryRun
    ? [
        ...existingV2,
        ...legacy
          .filter((r) => !existingV2.some((v) => ctx.getId(v) === ctx.getId(r)))
          .map((r) => ctx.toV2(r)),
      ]
    : await ctx.loadV2();

  const orphans = ctx.findOrphans?.(finalV2) ?? [];
  const post: DataMigrationPostCheck = {
    v2Count: finalV2.length,
    v2Checksum: checksumRecords(finalV2 as Array<Record<string, unknown>>),
    relationshipOk: orphans.length === 0,
    orphans,
    notes: ctx.dryRun ? ["dry_run_projected"] : [],
  };

  const ok = failed === 0 && schema.ok && post.relationshipOk;
  messages.push(
    `migrated=${migrated} skipped=${skipped} failed=${failed} dryRun=${ctx.dryRun}`,
  );

  return {
    component: ctx.component,
    dryRun: ctx.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    pre,
    post,
    migrated,
    skipped,
    failed,
    idempotent: true,
    ok,
    messages,
  };
}
