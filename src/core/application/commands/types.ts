/**
 * Command bus contracts — lightweight, Runtime-compatible style
 * (typed dispatch + handler registry). Not a Runtime engine duplicate.
 */

export interface CommandMeta {
  commandId?: string;
  idempotencyKey?: string;
  correlationId?: string;
  actorId: string;
  workspaceId?: string;
  issuedAt?: string;
}

export interface Command<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload;
  meta: CommandMeta;
}

export interface CommandHandler<TCommand extends Command = Command, TResult = unknown> {
  readonly commandType: TCommand["type"];
  execute(command: TCommand): Promise<TResult>;
}

export type ExecuteCommandResult<TDto = unknown> = {
  ok: true;
  data: TDto;
  replayed?: boolean;
  correlationId?: string;
} | {
  ok: false;
  error: import("../errors").ApplicationError;
};

export interface CommandBus {
  register<TCommand extends Command, TResult>(
    handler: CommandHandler<TCommand, TResult>,
  ): void;
  execute<TResult = unknown>(command: Command): Promise<ExecuteCommandResult<TResult>>;
}
