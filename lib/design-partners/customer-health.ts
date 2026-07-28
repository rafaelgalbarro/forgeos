import type { CustomerHealthScore } from "./types";
import { readStorage, writeStorage } from "./storage";
import { getJourneyProgress } from "./journey-tracker";
import { listDesignPartnerEvents } from "./analytics";
import { getFeedbackInboxCount } from "./feedback-center";
import { readSession } from "@/lib/auth/session-store";

const HEALTH_KEY = "forgeos-dp-customer-health";

let memoryHealth: CustomerHealthScore[] = [];

function read(): CustomerHealthScore[] {
  if (typeof window === "undefined") return memoryHealth;
  const stored = readStorage<CustomerHealthScore[]>(HEALTH_KEY, []);
  memoryHealth = stored;
  return memoryHealth;
}

function write(scores: CustomerHealthScore[]): void {
  memoryHealth = scores;
  writeStorage(HEALTH_KEY, scores);
}

function tierFromScore(score: number): CustomerHealthScore["tier"] {
  if (score >= 80) return "champion";
  if (score >= 60) return "healthy";
  if (score >= 40) return "neutral";
  return "at-risk";
}

export function computeCustomerHealth(input?: {
  userId?: string;
  workspaceId?: string;
  email?: string;
}): CustomerHealthScore {
  const session = typeof window !== "undefined" ? readSession() : null;
  const userId = input?.userId ?? session?.userId;
  const workspaceId = input?.workspaceId ?? session?.activeWorkspaceId;
  const email = input?.email ?? session?.email;

  const journey = getJourneyProgress(userId);
  const completed = journey?.completedStages.length ?? 0;
  const activation = Math.min(100, Math.round((completed / 10) * 100));

  const events = listDesignPartnerEvents().filter(
    (e) => e.userId === userId || e.workspaceId === workspaceId
  );
  const engagement = Math.min(100, events.length * 5);

  const feedbackBonus = Math.min(30, getFeedbackInboxCount() * 2);
  const retention = journey?.completedStages.includes("analytics") ? 85 : journey ? 55 : 20;

  const factors = {
    activation,
    retention,
    engagement,
    feedback: feedbackBonus,
  };

  const score = Math.round(
    factors.activation * 0.3 +
      factors.retention * 0.3 +
      factors.engagement * 0.25 +
      factors.feedback * 0.15
  );

  const health: CustomerHealthScore = {
    userId,
    workspaceId,
    email,
    score,
    tier: tierFromScore(score),
    factors,
    updatedAt: new Date().toISOString(),
  };

  const existing = read();
  const idx = existing.findIndex(
    (h) =>
      (userId && h.userId === userId) ||
      (workspaceId && h.workspaceId === workspaceId) ||
      (email && h.email === email)
  );
  if (idx >= 0) {
    existing[idx] = health;
    write(existing);
  } else {
    write([...existing, health]);
  }

  return health;
}

export function listCustomerHealthScores(): CustomerHealthScore[] {
  return read();
}

export function getCustomerHealth(input?: {
  userId?: string;
  workspaceId?: string;
}): CustomerHealthScore | null {
  const session = typeof window !== "undefined" ? readSession() : null;
  const userId = input?.userId ?? session?.userId;
  const workspaceId = input?.workspaceId ?? session?.activeWorkspaceId;

  return (
    read().find(
      (h) =>
        (userId && h.userId === userId) ||
        (workspaceId && h.workspaceId === workspaceId)
    ) ?? null
  );
}
