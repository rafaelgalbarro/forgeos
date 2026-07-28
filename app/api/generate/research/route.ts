import { NextResponse } from "next/server";
import { generateResearch } from "@/lib/ai/research-provider";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { KnowledgeRefSummary, ResearchRequest } from "@/lib/ai/types/research";

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

  const { projectName, ideaText, appType, targetCustomer, knowledgeRefs, discoveryContext } =
    body as Partial<ResearchRequest>;

  if (!projectName?.trim()) {
    return NextResponse.json({ error: "projectName is required" }, { status: 400 });
  }
  if (!ideaText?.trim() || ideaText.trim().length < 15) {
    return NextResponse.json({ error: "ideaText is required (min 15 characters)" }, { status: 400 });
  }

  const result = await generateResearch({
    projectName: projectName.trim(),
    ideaText: ideaText.trim(),
    appType: appType?.trim() || undefined,
    targetCustomer: targetCustomer?.trim() || undefined,
    knowledgeRefs: parseKnowledgeRefs(knowledgeRefs),
    discoveryContext: parseDiscoveryContext(discoveryContext),
  });

  return NextResponse.json(result);
}
