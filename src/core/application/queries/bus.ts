/** Lightweight QueryBus. */

import type { ApplicationError } from "../errors";
import { toApplicationError } from "../errors";
import type { Query, QueryBus, QueryHandler, ExecuteQueryResult } from "./types";

export function createQueryBus(): QueryBus {
  const handlers = new Map<string, QueryHandler>();

  return {
    register(handler) {
      if (handlers.has(handler.queryType)) {
        throw new Error(`Query handler already registered: ${handler.queryType}`);
      }
      handlers.set(handler.queryType, handler as QueryHandler);
    },

    async execute<TResult = unknown>(query: Query): Promise<ExecuteQueryResult<TResult>> {
      const correlationId = query.meta.correlationId;
      const handler = handlers.get(query.type);
      if (!handler) {
        const error: ApplicationError = {
          code: "HANDLER_NOT_FOUND",
          message: `No handler registered for query ${query.type}`,
          category: "infrastructure",
          retryable: false,
          correlationId,
        };
        return { ok: false, error };
      }
      try {
        const data = (await handler.execute(query)) as TResult;
        return { ok: true, data, correlationId };
      } catch (err) {
        return { ok: false, error: toApplicationError(err, correlationId) };
      }
    },
  };
}
