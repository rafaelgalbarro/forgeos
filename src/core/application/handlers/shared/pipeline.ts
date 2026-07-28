/** Shared handler helpers — identity, workspace, idempotency, telemetry. */

import type { Command } from "../../commands/types";
import { ApplicationFailure, fail } from "../../errors";
import type { ApplicationPorts } from "../../ports";
import type { Policy, PolicyContext } from "../../policies";
import { assertPolicy } from "../../policies";

export async function requireIdentity(ports: ApplicationPorts, actorId: string) {
  if (!actorId) {
    fail({
      code: "UNAUTHORIZED",
      message: "Actor identity required",
      category: "authorization",
    });
  }
  return ports.identity.requireActor(actorId);
}

export async function requireWorkspaceAccess(
  ports: ApplicationPorts,
  actorId: string,
  workspaceId: string,
) {
  const ok = await ports.authorization.canAccessWorkspace(actorId, workspaceId);
  if (!ok) {
    fail({
      code: "WORKSPACE_FORBIDDEN",
      message: `Actor cannot access workspace ${workspaceId}`,
      category: "authorization",
    });
  }
}

export function applyPolicy(policy: Policy, ctx: PolicyContext): void {
  assertPolicy(policy(ctx));
}

export async function withIdempotency<T>(
  ports: ApplicationPorts,
  command: Command,
  run: () => Promise<T>,
): Promise<{ result: T; replayed: boolean }> {
  const key = command.meta.idempotencyKey ?? command.meta.commandId;
  if (!key) {
    return { result: await run(), replayed: false };
  }
  const existing = await ports.uow.idempotency.get(key);
  if (existing) {
    return { result: JSON.parse(existing.resultJson) as T, replayed: true };
  }
  const result = await run();
  await ports.uow.idempotency.put(
    key,
    command.meta.commandId ?? key,
    JSON.stringify(result),
  );
  return { result, replayed: false };
}

export async function runCommandPipeline<T>(
  ports: ApplicationPorts,
  command: Command,
  opts: {
    workspaceId?: string;
    policy?: Policy;
    policyCtx?: Partial<PolicyContext>;
    useIdempotency?: boolean;
    name: string;
    execute: () => Promise<T>;
  },
): Promise<T & { replayed?: boolean }> {
  const started = Date.now();
  const actor = await requireIdentity(ports, command.meta.actorId);
  const workspaceId = opts.workspaceId ?? command.meta.workspaceId;
  if (workspaceId) {
    await requireWorkspaceAccess(ports, actor.actorId, workspaceId);
  }
  if (opts.policy) {
    applyPolicy(opts.policy, {
      actorId: actor.actorId,
      roles: actor.roles,
      workspaceId,
      ...opts.policyCtx,
    });
  }

  const executeBody = async (): Promise<T> => {
    await ports.uow.begin();
    try {
      const data = await opts.execute();
      await ports.uow.commit();
      return data;
    } catch (err) {
      await ports.uow.rollback();
      if (err instanceof ApplicationFailure) throw err;
      if (err instanceof Error && err.message.includes("transaction")) {
        throw new ApplicationFailure({
          code: "TRANSACTION_FAILED",
          message: err.message,
          category: "transaction",
          retryable: true,
          correlationId: command.meta.correlationId,
        });
      }
      throw err;
    }
  };

  try {
    let data: T;
    let replayed = false;
    if (opts.useIdempotency) {
      const wrapped = await withIdempotency(ports, command, executeBody);
      data = wrapped.result;
      replayed = wrapped.replayed;
    } else {
      data = await executeBody();
    }
    await ports.telemetry.record({
      name: opts.name,
      ok: true,
      correlationId: command.meta.correlationId,
      workspaceId,
      durationMs: Date.now() - started,
    });
    return { ...data, replayed };
  } catch (err) {
    await ports.telemetry.record({
      name: opts.name,
      ok: false,
      correlationId: command.meta.correlationId,
      workspaceId,
      durationMs: Date.now() - started,
    });
    throw err;
  }
}
