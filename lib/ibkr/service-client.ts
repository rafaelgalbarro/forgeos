import "server-only";

const baseUrl = process.env.IBKR_SERVICE_URL ?? "http://127.0.0.1:8000";
const apiKey = process.env.IBKR_INTERNAL_API_KEY;

export async function ibkrServiceFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiKey) {
    throw new Error("Falta IBKR_INTERNAL_API_KEY en el servidor de ForgeOS");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Key": apiKey,
      ...(init.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail ?? `IBKR service error ${response.status}`);
  }
  return body as T;
}
