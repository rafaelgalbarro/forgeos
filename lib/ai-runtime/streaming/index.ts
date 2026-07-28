/** ForgeOS AI Runtime RC6 — streaming support. */

import { isStreamingEnabled } from "../config";
import type { RuntimeProviderId } from "../types";

export interface StreamChunk {
  delta: string;
  done: boolean;
  provider?: RuntimeProviderId;
  model?: string;
}

export interface StreamSession {
  id: string;
  provider: RuntimeProviderId;
  model: string;
  startedAt: string;
  chunks: StreamChunk[];
  completed: boolean;
}

const sessions = new Map<string, StreamSession>();

export function createStreamSession(provider: RuntimeProviderId, model: string): StreamSession {
  const session: StreamSession = {
    id: crypto.randomUUID(),
    provider,
    model,
    startedAt: new Date().toISOString(),
    chunks: [],
    completed: false,
  };
  sessions.set(session.id, session);
  return session;
}

export function appendStreamChunk(sessionId: string, delta: string, done = false): StreamChunk | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const chunk: StreamChunk = { delta, done, provider: session.provider, model: session.model };
  session.chunks.push(chunk);
  if (done) session.completed = true;
  return chunk;
}

export function getStreamSession(sessionId: string): StreamSession | undefined {
  return sessions.get(sessionId);
}

export function getActiveStreamSessions(): StreamSession[] {
  return [...sessions.values()].filter((s) => !s.completed).slice(0, 50);
}

/** Simulate progressive streaming from a complete response. */
export async function* simulateStream(
  text: string,
  provider: RuntimeProviderId,
  model: string
): AsyncGenerator<StreamChunk> {
  if (!isStreamingEnabled()) {
    yield { delta: text, done: true, provider, model };
    return;
  }

  const words = text.split(/(\s+)/);
  let buffer = "";
  for (let i = 0; i < words.length; i++) {
    buffer += words[i];
    if (i % 3 === 2 || i === words.length - 1) {
      yield { delta: buffer, done: false, provider, model };
      buffer = "";
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  yield { delta: "", done: true, provider, model };
}

export function canStream(provider: RuntimeProviderId): boolean {
  return isStreamingEnabled() && provider !== "mcp" && provider !== "aws-bedrock";
}
