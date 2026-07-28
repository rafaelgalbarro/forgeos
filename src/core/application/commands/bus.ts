/**
 * Lightweight CommandBus — mirrors RuntimeEventBus handler-registry style
 * without duplicating the Runtime execution engine.
 */

import type { ApplicationError } from "../errors";
import { toApplicationError } from "../errors";
import type { Command, CommandBus, CommandHandler, ExecuteCommandResult } from "./types";

export function createCommandBus(): CommandBus {
  const handlers = new Map<string, CommandHandler>();

  return {
    register(handler) {
      if (handlers.has(handler.commandType)) {
        throw new Error(`Command handler already registered: ${handler.commandType}`);
      }
      handlers.set(handler.commandType, handler as CommandHandler);
    },

    async execute<TResult = unknown>(command: Command): Promise<ExecuteCommandResult<TResult>> {
      const correlationId = command.meta.correlationId ?? command.meta.commandId;
      const handler = handlers.get(command.type);
      if (!handler) {
        const error: ApplicationError = {
          code: "HANDLER_NOT_FOUND",
          message: `No handler registered for command ${command.type}`,
          category: "infrastructure",
          retryable: false,
          correlationId,
        };
        return { ok: false, error };
      }
      try {
        const data = (await handler.execute(command)) as TResult;
        return { ok: true, data, correlationId };
      } catch (err) {
        return { ok: false, error: toApplicationError(err, correlationId) };
      }
    },
  };
}
