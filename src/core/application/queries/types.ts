/**
 * Query bus contracts — read-only counterpart to CommandBus.
 */

export interface QueryMeta {
  actorId: string;
  workspaceId?: string;
  correlationId?: string;
}

export interface Query<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload;
  meta: QueryMeta;
}

export interface QueryHandler<TQuery extends Query = Query, TResult = unknown> {
  readonly queryType: TQuery["type"];
  execute(query: TQuery): Promise<TResult>;
}

export type ExecuteQueryResult<TView = unknown> = {
  ok: true;
  data: TView;
  correlationId?: string;
} | {
  ok: false;
  error: import("../errors").ApplicationError;
};

export interface QueryBus {
  register<TQuery extends Query, TResult>(handler: QueryHandler<TQuery, TResult>): void;
  execute<TResult = unknown>(query: Query): Promise<ExecuteQueryResult<TResult>>;
}
