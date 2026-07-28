/** @deprecated Use lib/home/home-summary — kept for backward-compatible type names. */

export type {
  HomeSummary as HomeSnapshot,
  HomeSummary as HomeCeoSnapshot,
} from "./home-summary-types";

export { loadHomeSummary as buildHomeSnapshot } from "./home-summary";
