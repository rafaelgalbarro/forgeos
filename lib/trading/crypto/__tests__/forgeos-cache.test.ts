import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  forgeosCacheFile,
  resolveForgeosCacheDir,
} from "@/lib/trading/crypto/forgeos-cache";

describe("forgeos shared cache dir", () => {
  let prevCache: string | undefined;
  let prevRoot: string | undefined;

  afterEach(() => {
    if (prevCache === undefined) delete process.env.FORGEOS_CACHE_DIR;
    else process.env.FORGEOS_CACHE_DIR = prevCache;
    if (prevRoot === undefined) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
  });

  it("honours FORGEOS_CACHE_DIR", () => {
    prevCache = process.env.FORGEOS_CACHE_DIR;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-cache-"));
    process.env.FORGEOS_CACHE_DIR = tmp;
    expect(resolveForgeosCacheDir()).toBe(tmp);
    expect(forgeosCacheFile("kraken-futures-engine-state.json")).toBe(
      path.join(tmp, "kraken-futures-engine-state.json"),
    );
  });
});
