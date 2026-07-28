/**
 * PROGRAM 6050 — Non-destructive delivery model migration.
 * Report dispositions: migrated | compatible | incomplete | conflict | orphaned | manual_review
 */

import type { CreationOutput } from "@/lib/creation-output/types";
import type { CodeProject } from "@/lib/code-generation/types";
import type {
  CanonicalArtifact,
  CanonicalOutput,
  CanonicalCodebase,
  MigrationDisposition,
  MigrationItemReport,
  MigrationReport,
} from "../types";
import { DELIVERY_MODEL_VERSION } from "../types";
import { adaptCreationOutput } from "../output/adapters";
import { adaptCodeProject } from "../codebase/adapters";
import { createArtifact } from "../artifact/registry";

export interface MigrationInput {
  missionId: string;
  creationOutputs?: CreationOutput[];
  codeProjects?: CodeProject[];
  /** Pre-existing canonical records (for conflict detection) */
  existingOutputs?: CanonicalOutput[];
  existingCodebases?: CanonicalCodebase[];
  /** Orphan legacy IDs with no resolvable payload */
  orphanLegacyIds?: { system: string; id: string }[];
}

export interface MigrationResult {
  report: MigrationReport;
  artifacts: CanonicalArtifact[];
  outputs: CanonicalOutput[];
  codebases: CanonicalCodebase[];
}

function emptyCounts(): Record<MigrationDisposition, number> {
  return {
    migrated: 0,
    compatible: 0,
    incomplete: 0,
    conflict: 0,
    orphaned: 0,
    manual_review: 0,
  };
}

export function migrateDeliveryModel(input: MigrationInput): MigrationResult {
  const startedAt = new Date().toISOString();
  const items: MigrationItemReport[] = [];
  const counts = emptyCounts();
  const artifacts: CanonicalArtifact[] = [];
  const outputs: CanonicalOutput[] = [];
  const codebases: CanonicalCodebase[] = [];

  const bump = (d: MigrationDisposition, item: MigrationItemReport) => {
    counts[d] += 1;
    items.push(item);
  };

  const existingOutIds = new Set(
    (input.existingOutputs ?? []).map((o) => o.legacySource?.id ?? o.outputId)
  );
  const existingCbIds = new Set(
    (input.existingCodebases ?? []).map((c) => c.legacySource?.id ?? c.codebaseId)
  );

  for (const legacy of input.creationOutputs ?? []) {
    try {
      if (existingOutIds.has(legacy.outputId)) {
        bump("compatible", {
          legacyId: legacy.outputId,
          legacySystem: "creation-output",
          disposition: "compatible",
          notes: "Already present in canonical store",
        });
        continue;
      }
      if (!legacy.type || !legacy.title) {
        bump("incomplete", {
          legacyId: legacy.outputId,
          legacySystem: "creation-output",
          disposition: "incomplete",
          notes: "Missing type or title",
        });
        continue;
      }
      const canonical = adaptCreationOutput(legacy);
      const conflict = (input.existingOutputs ?? []).find(
        (o) => o.outputId === canonical.outputId && o.version !== canonical.version
      );
      if (conflict) {
        bump("conflict", {
          legacyId: legacy.outputId,
          legacySystem: "creation-output",
          disposition: "conflict",
          canonicalId: canonical.outputId,
          notes: `Version conflict ${conflict.version} vs ${canonical.version}`,
        });
        continue;
      }
      outputs.push(canonical);

      for (const src of legacy.sourceArtifacts) {
        const art = createArtifact({
          artifactId: src.artifactId.startsWith("art-") ? src.artifactId : `art-${src.artifactId}`,
          missionId: legacy.missionId,
          ventureId: legacy.ventureId,
          kind: "OTHER",
          title: src.label,
          status: "READY",
          version: "1.0.0",
          contentRef: src.href,
          legacySource: { system: "creation-output:sourceArtifact", id: src.artifactId },
        });
        if (!artifacts.some((a) => a.artifactId === art.artifactId)) {
          artifacts.push(art);
        }
      }

      bump("migrated", {
        legacyId: legacy.outputId,
        legacySystem: "creation-output",
        disposition: "migrated",
        canonicalId: canonical.outputId,
      });
    } catch (e) {
      bump("manual_review", {
        legacyId: legacy.outputId,
        legacySystem: "creation-output",
        disposition: "manual_review",
        notes: e instanceof Error ? e.message : String(e),
      });
    }
  }

  for (const project of input.codeProjects ?? []) {
    try {
      if (existingCbIds.has(project.projectId)) {
        bump("compatible", {
          legacyId: project.projectId,
          legacySystem: "code-generation",
          disposition: "compatible",
          notes: "Already present in canonical store",
        });
        continue;
      }
      if (!project.files?.length) {
        bump("incomplete", {
          legacyId: project.projectId,
          legacySystem: "code-generation",
          disposition: "incomplete",
          notes: "No files",
        });
        continue;
      }
      const canonical = adaptCodeProject(project);
      codebases.push(canonical);
      bump("migrated", {
        legacyId: project.projectId,
        legacySystem: "code-generation",
        disposition: "migrated",
        canonicalId: canonical.codebaseId,
      });
    } catch (e) {
      bump("manual_review", {
        legacyId: project.projectId,
        legacySystem: "code-generation",
        disposition: "manual_review",
        notes: e instanceof Error ? e.message : String(e),
      });
    }
  }

  for (const orphan of input.orphanLegacyIds ?? []) {
    bump("orphaned", {
      legacyId: orphan.id,
      legacySystem: orphan.system,
      disposition: "orphaned",
      notes: "No resolvable payload",
    });
  }

  return {
    report: {
      program: DELIVERY_MODEL_VERSION,
      startedAt,
      finishedAt: new Date().toISOString(),
      counts,
      items,
    },
    artifacts,
    outputs,
    codebases,
  };
}

export function formatMigrationReport(report: MigrationReport): string {
  const lines = [
    report.program,
    `started: ${report.startedAt}`,
    `finished: ${report.finishedAt}`,
    `migrated=${report.counts.migrated} compatible=${report.counts.compatible} incomplete=${report.counts.incomplete} conflict=${report.counts.conflict} orphaned=${report.counts.orphaned} manual_review=${report.counts.manual_review}`,
    ...report.items.map(
      (i) =>
        `  [${i.disposition}] ${i.legacySystem}:${i.legacyId}${i.canonicalId ? ` → ${i.canonicalId}` : ""}${i.notes ? ` — ${i.notes}` : ""}`
    ),
  ];
  return lines.join("\n");
}
