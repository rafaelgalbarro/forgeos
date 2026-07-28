/** Program 10000 — Client-safe Venture E2E exports (no engines). */

export type { VentureE2ESnapshot, E2EChecklistStatus } from "./types";
export { VENTURE_E2E_VERSION, VENTURE_E2E_DISCLAIMER } from "./types";
export {
  isValidVentureProject,
  resolveVentureFixture,
  ensureFixtureVentureSeeded,
} from "./fixture-registry";
