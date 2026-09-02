/**
 * Browser/server-safe JSON fetch — never treats HTML error pages as JSON.
 */

export type SafeJsonFetchResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  contentType: string | null;
};

function summarizeNonJsonBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Empty non-JSON response";
  if (/^<!DOCTYPE html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return "Received HTML instead of JSON (likely a 404 or Next.js error page)";
  }
  const oneLine = trimmed.replace(/\s+/g, " ").slice(0, 120);
  return `Non-JSON response: ${oneLine}`;
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

/**
 * Fetch JSON safely: check ok + content-type, parse only when JSON-like,
 * never throw on HTML bodies.
 */
export async function safeJsonFetch<T = unknown>(
  input: string | URL,
  init?: RequestInit,
): Promise<SafeJsonFetchResult<T>> {
  try {
    const response = await fetch(input, init);
    const contentType = response.headers.get("content-type");
    const rawText = stripBom(await response.text());
    const looksJson =
      Boolean(contentType?.includes("application/json")) ||
      rawText.startsWith("{") ||
      rawText.startsWith("[");

    if (!looksJson) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: summarizeNonJsonBody(rawText),
        contentType,
      };
    }

    let data: T | null = null;
    try {
      data = JSON.parse(rawText) as T;
    } catch {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: summarizeNonJsonBody(rawText),
        contentType,
      };
    }

    if (!response.ok) {
      const body = data as { error?: string; detail?: string; message?: string } | null;
      const message =
        body?.error ??
        body?.detail ??
        (typeof body?.message === "string" ? body.message : null) ??
        `Request failed (${response.status})`;
      return {
        ok: false,
        status: response.status,
        data,
        error: typeof message === "string" ? message : `Request failed (${response.status})`,
        contentType,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
      contentType,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "Network request failed",
      contentType: null,
    };
  }
}
