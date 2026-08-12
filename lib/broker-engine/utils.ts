export function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

export function parseJsonBody<T>(body?: string): T {
  if (!body) return {} as T;
  return JSON.parse(body) as T;
}

export function routeNotSupported(path: string): never {
  throw new Error(`BrokerEngine route not supported: ${path}`);
}
