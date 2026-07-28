/**
 * PROGRAM 6085 — File-backed UnitOfWork for V2 (survives process restart).
 * Not localStorage. Not process-memory-only. Stores under .forgeos/v2-store/
 */

import fs from "fs";
import path from "path";
import type {
  Build,
  Codebase,
  Decision,
  Deployment,
  DomainEvent,
  Mission,
  Output,
  Preview,
  Release,
  Venture,
  Workspace,
} from "../application/compat-domain";
import type {
  ApplicationPorts,
  UnitOfWorkPort,
} from "../application/ports";
import {
  createInMemoryStore,
  createInMemoryUnitOfWork,
  type InMemoryStore,
} from "../application/testing/in-memory";
import type { ClockPort } from "../application/ports";

const DEFAULT_STORE_DIR = path.join(process.cwd(), ".forgeos", "v2-store");

function mapToObject<T>(m: Map<string, T>): Record<string, T> {
  return Object.fromEntries(m.entries());
}

function objectToMap<T>(o: Record<string, T> | undefined): Map<string, T> {
  return new Map(Object.entries(o ?? {}));
}

export interface FileStoreSnapshot {
  version: 1;
  workspaces: Record<string, Workspace>;
  ventures: Record<string, Venture>;
  missions: Record<string, Mission>;
  decisions: Record<string, Decision>;
  outputs: Record<string, Output>;
  codebases: Record<string, Codebase>;
  builds: Record<string, Build>;
  previews: Record<string, Preview>;
  releases: Record<string, Release>;
  deployments: Record<string, Deployment>;
  events: DomainEvent[];
  idempotency: Record<string, { commandId: string; resultJson: string }>;
  workflowPlans?: Record<string, unknown>;
  deliverySnapshots?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
  previewClassifications?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export function getV2StoreDir(custom?: string): string {
  return custom || process.env.FORGEOS_V2_STORE_DIR || DEFAULT_STORE_DIR;
}

export function storeFilePath(dir?: string): string {
  return path.join(getV2StoreDir(dir), "application-state.json");
}

export function loadFileStore(dir?: string): InMemoryStore & {
  workflowPlans: Map<string, unknown>;
  deliverySnapshots: Map<string, unknown>;
  lineage: Map<string, unknown>;
  previewClassifications: Map<string, string>;
  meta: Record<string, unknown>;
} {
  const file = storeFilePath(dir);
  const base = createInMemoryStore();
  const extra = {
    workflowPlans: new Map<string, unknown>(),
    deliverySnapshots: new Map<string, unknown>(),
    lineage: new Map<string, unknown>(),
    previewClassifications: new Map<string, string>(),
    meta: {} as Record<string, unknown>,
  };
  if (!fs.existsSync(file)) {
    return { ...base, ...extra };
  }
  try {
    const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const data = JSON.parse(raw) as FileStoreSnapshot;
    base.workspaces = objectToMap(data.workspaces);
    base.ventures = objectToMap(data.ventures);
    base.missions = objectToMap(data.missions);
    base.decisions = objectToMap(data.decisions);
    base.outputs = objectToMap(data.outputs);
    base.codebases = objectToMap(data.codebases);
    base.builds = objectToMap(data.builds);
    base.previews = objectToMap(data.previews);
    base.releases = objectToMap(data.releases);
    base.deployments = objectToMap(data.deployments);
    base.events = Array.isArray(data.events) ? data.events : [];
    base.idempotency = objectToMap(data.idempotency);
    extra.workflowPlans = objectToMap(data.workflowPlans as Record<string, unknown> | undefined);
    extra.deliverySnapshots = objectToMap(
      data.deliverySnapshots as Record<string, unknown> | undefined,
    );
    extra.lineage = objectToMap(data.lineage as Record<string, unknown> | undefined);
    extra.previewClassifications = objectToMap(
      data.previewClassifications as Record<string, string> | undefined,
    );
    extra.meta = data.meta ?? {};
  } catch (err) {
    console.error("[forgeos-v2-store] failed to load; starting empty", err);
  }
  return { ...base, ...extra };
}

export function persistFileStore(
  store: InMemoryStore & {
    workflowPlans?: Map<string, unknown>;
    deliverySnapshots?: Map<string, unknown>;
    lineage?: Map<string, unknown>;
    previewClassifications?: Map<string, string>;
    meta?: Record<string, unknown>;
  },
  dir?: string,
): void {
  const root = getV2StoreDir(dir);
  fs.mkdirSync(root, { recursive: true });
  const snapshot: FileStoreSnapshot = {
    version: 1,
    workspaces: mapToObject(store.workspaces),
    ventures: mapToObject(store.ventures),
    missions: mapToObject(store.missions),
    decisions: mapToObject(store.decisions),
    outputs: mapToObject(store.outputs),
    codebases: mapToObject(store.codebases),
    builds: mapToObject(store.builds),
    previews: mapToObject(store.previews),
    releases: mapToObject(store.releases),
    deployments: mapToObject(store.deployments),
    events: store.events,
    idempotency: mapToObject(store.idempotency),
    workflowPlans: mapToObject(store.workflowPlans ?? new Map()),
    deliverySnapshots: mapToObject(store.deliverySnapshots ?? new Map()),
    lineage: mapToObject(store.lineage ?? new Map()),
    previewClassifications: mapToObject(store.previewClassifications ?? new Map()),
    meta: store.meta ?? {},
  };
  const tmp = storeFilePath(dir) + ".tmp";
  const file = storeFilePath(dir);
  fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export type FileBackedStore = ReturnType<typeof loadFileStore>;

export function createFileBackedUnitOfWork(store: FileBackedStore, dir?: string): UnitOfWorkPort {
  const inner = createInMemoryUnitOfWork(store);
  return {
    ...inner,
    async commit() {
      await inner.commit();
      persistFileStore(store, dir);
    },
  };
}

export function createFileBackedPorts(options?: {
  storeDir?: string;
  roles?: string[];
  sandboxAvailable?: boolean;
}): {
  ports: ApplicationPorts;
  store: FileBackedStore;
  persist: () => void;
} {
  const dir = options?.storeDir;
  const store = loadFileStore(dir);
  const uow = createFileBackedUnitOfWork(store, dir);
  const roles = options?.roles ?? ["founder", "owner"];
  const sandboxAvailable = options?.sandboxAvailable ?? false;

  let idSeq = Number(store.meta.idSeq ?? 0);
  const clock: ClockPort = {
    now: () => new Date().toISOString(),
    createId: (prefix) => {
      idSeq += 1;
      store.meta.idSeq = idSeq;
      return `${prefix}-${Date.now()}-${idSeq}`;
    },
  };

  const ports: ApplicationPorts = {
    clock,
    identity: {
      async requireActor(actorId) {
        if (!actorId) throw new Error("Actor identity required");
        return { actorId, roles };
      },
    },
    authorization: {
      async hasRole(_actorId, role) {
        return roles.includes(role);
      },
      async canAccessWorkspace() {
        return true;
      },
    },
    telemetry: {
      async record() {
        /* persisted via events when needed */
      },
    },
    notifications: {
      async notify() {
        /* noop */
      },
    },
    ai: {
      async generateSummary(prompt) {
        return `AI summary: ${prompt.slice(0, 120)}`;
      },
    },
    factories: {
      async planOutputs(missionId) {
        return [
          { kind: "venture", title: `Venture for ${missionId}` },
          { kind: "brand", title: `Brand for ${missionId}` },
          { kind: "website", title: `Website for ${missionId}` },
          { kind: "web_application", title: `Web App for ${missionId}` },
          { kind: "backend", title: `Backend for ${missionId}` },
          { kind: "database", title: `Database for ${missionId}` },
        ];
      },
    },
    execution: {
      async requestExecution(input) {
        const executionId = `exec-${Date.now()}-${input.kind}`;
        return { accepted: true, executionId };
      },
    },
    jobs: {
      async enqueue(job) {
        return { jobId: `job-${job.type}-${Date.now()}` };
      },
    },
    sandbox: {
      async createPreview(missionId) {
        if (!sandboxAvailable) {
          // Honest: no fake READY URL
          return {
            previewId: `plan-${missionId}`,
            url: "",
          };
        }
        return { previewId: `prev-${missionId}`, url: `http://127.0.0.1:3100` };
      },
      async stopPreview() {
        /* noop */
      },
    },
    sourceControl: {
      async scaffoldRepo(missionId) {
        return { repoUrl: `local://forgeos-projects/${missionId}` };
      },
    },
    deployment: {
      async deploy() {
        // Never claim real deploy without credentials
        return { accepted: false };
      },
      async rollback() {
        return { accepted: false };
      },
    },
    uow,
  };

  return {
    ports,
    store,
    persist: () => persistFileStore(store, dir),
  };
}
