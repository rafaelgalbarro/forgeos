import type { FeedbackRecord } from "./types";

const STORAGE_KEY = "forgeos-feedback";

let memoryFeedbacks: FeedbackRecord[] = [];

function read(): FeedbackRecord[] {
  if (typeof window === "undefined") return memoryFeedbacks;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryFeedbacks = JSON.parse(raw) as FeedbackRecord[];
  } catch {
    /* keep memory */
  }
  return memoryFeedbacks;
}

function write(records: FeedbackRecord[]): void {
  memoryFeedbacks = records;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

export function listFeedback(): FeedbackRecord[] {
  return read();
}

export function submitFeedback(input: {
  message: string;
  category: FeedbackRecord["category"];
  page: string;
}): FeedbackRecord {
  const record: FeedbackRecord = {
    id: `fb-${Date.now()}`,
    message: input.message.trim(),
    category: input.category,
    page: input.page,
    createdAt: new Date().toISOString(),
  };
  const records = [...read(), record];
  write(records);
  return record;
}
