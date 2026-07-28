import type { BetaFeedbackRecord, FeedbackCategory } from "./types";
import { readStorage, writeStorage } from "./storage";
import { trackBetaEvent } from "./analytics";

const STORAGE_KEY = "forgeos-beta-feedback";

let memoryFeedbacks: BetaFeedbackRecord[] = [];

function read(): BetaFeedbackRecord[] {
  if (typeof window === "undefined") return memoryFeedbacks;
  const stored = readStorage<BetaFeedbackRecord[]>(STORAGE_KEY, []);
  memoryFeedbacks = stored;
  return memoryFeedbacks;
}

function write(records: BetaFeedbackRecord[]): void {
  memoryFeedbacks = records;
  writeStorage(STORAGE_KEY, records);
}

export function listBetaFeedback(): BetaFeedbackRecord[] {
  return read();
}

export function submitBetaFeedback(input: {
  message: string;
  category: FeedbackCategory;
  page: string;
  rating?: number;
  userId?: string;
  email?: string;
}): BetaFeedbackRecord {
  const record: BetaFeedbackRecord = {
    id: `bfb-${Date.now()}`,
    message: input.message.trim(),
    category: input.category,
    page: input.page,
    rating: input.rating,
    userId: input.userId,
    email: input.email,
    createdAt: new Date().toISOString(),
  };
  const records = [...read(), record];
  write(records);
  trackBetaEvent({
    event: "feedback_submit",
    path: input.page,
    userId: input.userId,
    meta: { category: input.category },
  });
  return record;
}

export function getFeedbackCount(): number {
  return read().length;
}
