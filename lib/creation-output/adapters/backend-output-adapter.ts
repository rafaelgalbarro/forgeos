/** PROGRAM 5350 — Backend output adapter (light technical view). */

import type { BackendOutputPayload, CreationOutput } from "../types";
import { createOutputId } from "../output-registry";
import { buildGenericBackendEntities } from "../demo-fixtures";

export interface BackendAdapterInput {
  missionId: string;
  ventureId?: string;
  ideaText: string;
  projectName: string;
}

export async function buildBackendOutput(input: BackendAdapterInput): Promise<CreationOutput> {
  const { entities, relations } = buildGenericBackendEntities(input.ideaText);
  const now = new Date().toISOString();

  const payload: BackendOutputPayload = {
    entities,
    relations,
    dbSchema: entities.map((e) => `CREATE TABLE ${e.name} (...)`),
    apiEndpoints: entities.slice(0, 6).flatMap((e) => [
      { method: "GET", path: `/api/${e.name}`, description: `List ${e.name}`, auth: true },
      { method: "POST", path: `/api/${e.name}`, description: `Create ${e.name}`, auth: true },
    ]),
    auth: "Supabase Auth — demo (email/password sandbox)",
    roles: ["admin", "manager", "technician", "viewer"],
    jobs: ["sync_inventory", "route_optimizer", "billing_batch"],
    events: ["incident.created", "work_order.completed", "invoice.sent"],
    integrations: ["Supabase", "Stripe (sandbox)", "SendGrid (mock)"],
    envPlan: [
      "NEXT_PUBLIC_SUPABASE_URL=sandbox",
      "SUPABASE_SERVICE_ROLE_KEY=***preview***",
      "STRIPE_SECRET_KEY=sk_test_***",
      "VERCEL_ENV=preview",
    ],
  };

  return {
    outputId: createOutputId("BACKEND_OUTPUT"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    type: "BACKEND_OUTPUT",
    title: `${input.projectName} — Backend`,
    status: "PREVIEW_READY",
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    sourceArtifacts: [{ artifactId: `art-backend-${input.missionId}`, type: "backend", label: "Backend Schema" }],
    previewMode: "dry-run",
    files: [
      { path: "supabase/migrations/", kind: "directory", description: "DB migrations" },
      { path: "app/api/", kind: "directory", description: "API routes" },
    ],
    routes: payload.apiEndpoints.map((ep, i) => ({
      id: `ep-${i}`,
      path: ep.path,
      label: `${ep.method} ${ep.path}`,
    })),
    screenshots: [],
    dataModel: { entities, provider: "supabase" },
    apiSpec: {
      baseUrl: "/api",
      endpoints: payload.apiEndpoints,
      auth: payload.auth,
    },
    approvals: [],
    warnings: [
      { id: "w-backend-light", severity: "info", message: "Vista técnica ligera — sin motor DB en cliente", code: "LIGHT_VIEW" },
    ],
    nextActions: [
      { id: "na-export", label: "Exportar schema", kind: "export" },
      { id: "na-approve", label: "Aprobar backend", kind: "approve" },
    ],
    payload,
    validation: {
      score: 80,
      passed: true,
      checks: [
        { id: "entities", label: `${entities.length} entidades`, status: "pass" },
        { id: "api", label: `${payload.apiEndpoints.length} endpoints`, status: "pass" },
      ],
      source: "adapter",
    },
  };
}
