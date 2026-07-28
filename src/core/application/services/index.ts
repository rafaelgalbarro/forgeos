/** Application services — idempotency helpers and transaction guidance. */

import type { Command } from "../commands/types";
import type { IdempotencyStorePort } from "../ports";

/**
 * Builds a stable idempotency key for execution-style commands.
 * Prefer explicit meta.idempotencyKey from the UI/client.
 */
export function resolveIdempotencyKey(command: Command): string | undefined {
  return command.meta.idempotencyKey ?? command.meta.commandId;
}

export async function rememberCommandResult(
  store: IdempotencyStorePort,
  key: string,
  commandId: string,
  result: unknown,
): Promise<void> {
  await store.put(key, commandId, JSON.stringify(result));
}

export async function loadCommandResult<T>(
  store: IdempotencyStorePort,
  key: string,
): Promise<T | null> {
  const hit = await store.get(key);
  if (!hit) return null;
  return JSON.parse(hit.resultJson) as T;
}
