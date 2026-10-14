/**
 * Persist stocks-cycle counter for EU ↔ US premarket alternation.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".forgeos", "cache", "stocks-cycle-alternate.json");

type Shape = { counter: number; updatedAt: string };

function read(): Shape {
  try {
    if (!fs.existsSync(FILE)) return { counter: 0, updatedAt: "" };
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as Shape;
    return raw && typeof raw.counter === "number" ? raw : { counter: 0, updatedAt: "" };
  } catch {
    return { counter: 0, updatedAt: "" };
  }
}

/** Returns counter value used for this cycle, then increments for next. */
export function bumpStocksCycleCounter(): number {
  const cur = read().counter;
  const next = cur + 1;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(
      FILE,
      JSON.stringify({ counter: next, updatedAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
  } catch {
    /* non-fatal */
  }
  return cur;
}

/** Test hook */
export function resetStocksCycleCounterForTests(): void {
  try {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  } catch {
    /* ignore */
  }
}
