import "server-only";

import { IBKR_SERVICE_UNAVAILABLE, resolveIbkrServicePath } from "./broker-path-map";

function getBaseUrl(): string {
  return process.env.IBKR_SERVICE_URL ?? "http://127.0.0.1:8002";
}

function getApiKey(): string | undefined {
  return process.env.IBKR_INTERNAL_API_KEY;
}

export class IbkrServiceUnavailableError extends Error {
  readonly status = 503;
  readonly payload = IBKR_SERVICE_UNAVAILABLE;

  constructor(message = IBKR_SERVICE_UNAVAILABLE.error) {
    super(message);
    this.name = "IbkrServiceUnavailableError";
  }
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function summarizeNonJson(text: string): string {
  const trimmed = text.trim();
  if (/^<!DOCTYPE html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return "IBKR service returned HTML instead of JSON";
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 160) || "Empty non-JSON response";
}

export async function ibkrServiceFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new IbkrServiceUnavailableError("Falta IBKR_INTERNAL_API_KEY en el servidor de ForgeOS");
  }

  const servicePath = resolveIbkrServicePath(path);
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${servicePath}`, {
      ...init,
      cache: "no-store",
      signal: init.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": apiKey,
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IBKR service unreachable";
    throw new IbkrServiceUnavailableError(
      message.includes("fetch failed") || message.includes("ECONNREFUSED")
        ? IBKR_SERVICE_UNAVAILABLE.error
        : message,
    );
  }

  const rawText = stripBom(await response.text());
  const contentType = response.headers.get("content-type") ?? "";
  const looksJson =
    contentType.includes("application/json") || rawText.startsWith("{") || rawText.startsWith("[");

  if (!looksJson) {
    if (!response.ok) {
      throw new IbkrServiceUnavailableError(IBKR_SERVICE_UNAVAILABLE.error);
    }
    throw new Error(summarizeNonJson(rawText));
  }

  let body: unknown = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(summarizeNonJson(rawText));
  }

  if (!response.ok) {
    const detailRaw =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail: unknown }).detail
        : null;
    const detail =
      typeof detailRaw === "string"
        ? detailRaw
        : detailRaw && typeof detailRaw === "object" && detailRaw !== null && "error" in detailRaw
          ? String((detailRaw as { error: unknown }).error)
          : `IBKR service error ${response.status}`;
    // Preserve structured offline payloads from FastAPI (TWS_OFFLINE etc.).
    if (
      detailRaw &&
      typeof detailRaw === "object" &&
      detailRaw !== null &&
      "state" in detailRaw
    ) {
      const structured = detailRaw as Record<string, unknown>;
      const err = new Error(String(structured.error ?? detail));
      (err as Error & { payload?: unknown }).payload = structured;
      throw err;
    }
    if (response.status === 503 || response.status === 502 || response.status === 504) {
      throw new IbkrServiceUnavailableError(detail || IBKR_SERVICE_UNAVAILABLE.error);
    }
    throw new Error(detail);
  }

  return body as T;
}
