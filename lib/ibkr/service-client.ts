import "server-only";

import { IBKR_SERVICE_UNAVAILABLE, resolveIbkrServicePath } from "./broker-path-map";
import {
  getCachedIbkrAccount,
  getCachedIbkrPositions,
  recordBrokerConnectCall,
  startBrokerCallMetricsLogger,
} from "./broker-reads";

/** Default timeout for all ForgeOS → broker HTTP calls. */
export const IBKR_SERVICE_FETCH_TIMEOUT_MS = 8_000;

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

function normalizePath(path: string): string {
  return resolveIbkrServicePath(path).split("?")[0]!.replace(/\/$/, "") || "/";
}

function isGet(init: RequestInit): boolean {
  const m = (init.method ?? "GET").toUpperCase();
  return m === "GET" || m === "";
}

function mergeAbortSignals(
  userSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!userSignal) return timeout;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([userSignal, timeout]);
  }
  // Fallback: prefer user signal if already aborted, else timeout
  if (userSignal.aborted) return userSignal;
  return timeout;
}

async function rawIbkrFetch<T>(servicePath: string, init: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new IbkrServiceUnavailableError("Falta IBKR_INTERNAL_API_KEY en el servidor de ForgeOS");
  }

  const signal = mergeAbortSignals(init.signal, IBKR_SERVICE_FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${servicePath}`, {
      ...init,
      cache: "no-store",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": apiKey,
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IBKR service unreachable";
    throw new IbkrServiceUnavailableError(
      message.includes("fetch failed") ||
        message.includes("ECONNREFUSED") ||
        message.includes("TimeoutError") ||
        message.includes("aborted") ||
        message.includes("timed out")
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
          : detailRaw && typeof detailRaw === "object" && detailRaw !== null && "reject_reason" in detailRaw
            ? String((detailRaw as { reject_reason: unknown }).reject_reason)
            : detailRaw && typeof detailRaw === "object" && detailRaw !== null && "ibkrError" in detailRaw
              ? String((detailRaw as { ibkrError: unknown }).ibkrError)
              : `IBKR service error ${response.status}`;
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
    if (
      response.status === 422 &&
      detailRaw &&
      typeof detailRaw === "object" &&
      detailRaw !== null
    ) {
      const structured = detailRaw as Record<string, unknown>;
      const err = new Error(detail);
      (err as Error & { payload?: unknown; status?: number }).payload = structured;
      (err as Error & { status?: number }).status = 422;
      throw err;
    }
    if (response.status === 503 || response.status === 502 || response.status === 504) {
      throw new IbkrServiceUnavailableError(detail || IBKR_SERVICE_UNAVAILABLE.error);
    }
    throw new Error(detail);
  }

  return body as T;
}

/**
 * ForgeOS → ibkr-broker HTTP client.
 * GET /account and /positions are cached 30s with in-flight dedupe (all consumers share one call).
 * Default AbortSignal timeout: 8s.
 */
export async function ibkrServiceFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  startBrokerCallMetricsLogger();

  const servicePath = resolveIbkrServicePath(path);
  const norm = normalizePath(path);
  const method = (init.method ?? "GET").toUpperCase();

  if (method === "POST" && (norm.endsWith("/connect") || norm.endsWith("/reconnect") || norm.endsWith("/auto-reconnect"))) {
    recordBrokerConnectCall();
  }

  if (isGet(init) && norm.endsWith("/account")) {
    return getCachedIbkrAccount(() => rawIbkrFetch<T>(servicePath, init));
  }
  if (isGet(init) && norm.endsWith("/positions")) {
    return getCachedIbkrPositions(() => rawIbkrFetch<T>(servicePath, init));
  }

  return rawIbkrFetch<T>(servicePath, init);
}
