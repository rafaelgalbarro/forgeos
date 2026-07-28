import { NextResponse } from "next/server";
import { generateProductPRD } from "@/lib/ai/provider";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { KnowledgeRefSummary } from "@/lib/ai/types/research";
import type { ResearchReport } from "@/lib/ai/types/research";
import type { ProductPRDRequest } from "@/lib/ai/types/product";
import { validateResearchReportShape } from "@/lib/ai/validate-research";

function parseKnowledgeRefs(value: unknown): KnowledgeRefSummary[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      domain: String(item.domain ?? ""),
      title: String(item.title ?? ""),
    }))
    .filter((ref) => ref.id && ref.title);
}

function parseResearchReport(value: unknown): ResearchReport | null {
  if (!value || typeof value !== "object") return null;
  const report = value as Record<string, unknown>;
  if (report.data && typeof report.data === "object") {
    const data = report.data as ResearchReport;
    return validateResearchReportShape(data) ? data : null;
  }
  return validateResearchReportShape(value) ? (value as ResearchReport) : null;
}

function parseDiscoveryContext(value: unknown): DiscoveryContext | null {
  if (!value || typeof value !== "object") return null;
  const ctx = value as Partial<DiscoveryContext>;
  if (!Array.isArray(ctx.answers)) return null;
  return value as DiscoveryContext;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    projectName,
    description,
    appType,
    targetCustomer,
    researchReport,
    knowledgeRefs,
    discoveryContext,
  } = body as Partial<ProductPRDRequest & { researchReport?: unknown; knowledgeRefs?: unknown }>;

  if (!projectName?.trim()) {
    return NextResponse.json({ error: "projectName is required" }, { status: 400 });
  }
  if (!description?.trim() || description.trim().length < 15) {
    return NextResponse.json({ error: "description is required (min 15 characters)" }, { status: 400 });
  }
  if (!appType?.trim()) {
    return NextResponse.json({ error: "appType is required" }, { status: 400 });
  }
  if (!targetCustomer?.trim()) {
    return NextResponse.json({ error: "targetCustomer is required" }, { status: 400 });
  }

  const result = await generateProductPRD({
    projectName: projectName.trim(),
    description: description.trim(),
    appType: appType.trim(),
    targetCustomer: targetCustomer.trim(),
    researchReport: parseResearchReport(researchReport),
    knowledgeRefs: parseKnowledgeRefs(knowledgeRefs),
    discoveryContext: parseDiscoveryContext(discoveryContext),
  });

  return NextResponse.json(result);
}
