import type { FeatureRequest, FeatureRequestPriority, FeatureRequestStatus } from "./types";
import { readStorage, writeStorage } from "./storage";
import { trackDesignPartnerEvent } from "./analytics";

const STORAGE_KEY = "forgeos-dp-feature-requests";

let memoryRequests: FeatureRequest[] = [];

function read(): FeatureRequest[] {
  if (typeof window === "undefined") return memoryRequests;
  const stored = readStorage<FeatureRequest[]>(STORAGE_KEY, []);
  memoryRequests = stored;
  return memoryRequests;
}

function write(records: FeatureRequest[]): void {
  memoryRequests = records;
  writeStorage(STORAGE_KEY, records);
}

export function listFeatureRequests(): FeatureRequest[] {
  return read().sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
}

export function getFeatureRequestCount(): number {
  return read().length;
}

export function submitFeatureRequest(input: {
  title: string;
  description: string;
  priority?: FeatureRequestPriority;
  userId?: string;
  workspaceId?: string;
  email?: string;
}): FeatureRequest {
  const now = new Date().toISOString();
  const record: FeatureRequest = {
    id: `dfr-${Date.now()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    status: "submitted",
    priority: input.priority ?? "medium",
    votes: 1,
    userId: input.userId,
    workspaceId: input.workspaceId,
    email: input.email,
    createdAt: now,
    updatedAt: now,
  };
  write([...read(), record]);
  trackDesignPartnerEvent({
    event: "dp_feature_request",
    userId: input.userId,
    workspaceId: input.workspaceId,
    label: record.title,
  });
  return record;
}

export function upvoteFeatureRequest(id: string): FeatureRequest | null {
  const requests = read();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  requests[idx] = {
    ...requests[idx],
    votes: requests[idx].votes + 1,
    updatedAt: new Date().toISOString(),
  };
  write(requests);
  return requests[idx];
}

export function updateFeatureRequestStatus(
  id: string,
  status: FeatureRequestStatus
): FeatureRequest | null {
  const requests = read();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  requests[idx] = { ...requests[idx], status, updatedAt: new Date().toISOString() };
  write(requests);
  return requests[idx];
}
